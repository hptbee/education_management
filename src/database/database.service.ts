import type { ClassroomDatabase, DatabaseSummary } from "./types";
import type { ClassroomDatabaseStorage } from "./storage/storage.interface";
import { IndexedDbClassroomStorage } from "./storage/indexed-db.storage";
import { createEmptyDatabase, DATABASE_VERSION } from "./database.factory";
import { assertSafeClassroomId, generateDatabaseId, generateExportFilename } from "./database.utils";
import { normalizeClassroomDatabase } from "../utils/classroomRoles";
import { migrateLegacyGiftImages } from "../utils/gifts";
import { classroomAssetService } from "./assets/classroom-asset.service";
import type { ClassroomSettings } from "../types/models";
import { isTauri } from "./tauri-fs.service";
import { assertImportFileSize } from "./importLimits";
import { getLastClassroomId, setLastClassroomId } from "../utils/lastClassroom";

function assertEntityArray(
  record: Record<string, unknown>,
  field: string,
  requireId = true,
): void {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new Error(`Định dạng file không hợp lệ: thiếu hoặc sai kiểu mảng "${field}".`);
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Định dạng file không hợp lệ: phần tử ${i + 1} trong "${field}" không phải object.`);
    }
    if (requireId) {
      const id = (item as Record<string, unknown>).id;
      if (typeof id !== "string" || !id.trim()) {
        throw new Error(`Định dạng file không hợp lệ: phần tử ${i + 1} trong "${field}" thiếu id.`);
      }
    }
  }
}

function assertImportShape(data: unknown): asserts data is ClassroomDatabase {
  if (!data || typeof data !== "object") {
    throw new Error("Định dạng file không hợp lệ: dữ liệu trống hoặc không phải JSON object.");
  }

  const record = data as Record<string, unknown>;
  const metadata = record.metadata as Record<string, unknown> | undefined;
  const settings = record.classroomSettings as Record<string, unknown> | undefined;

  if (!metadata?.id || typeof metadata.id !== "string") {
    throw new Error("Định dạng file không hợp lệ: thiếu metadata.id.");
  }
  assertSafeClassroomId(metadata.id);
  if (typeof metadata.version !== "number") {
    throw new Error("Định dạng file không hợp lệ: metadata.version phải là số.");
  }
  if (metadata.version > DATABASE_VERSION) {
    throw new Error(`Định dạng file không hợp lệ: phiên bản ${metadata.version} chưa được hỗ trợ.`);
  }
  if (!settings?.className || typeof settings.className !== "string") {
    throw new Error("Định dạng file không hợp lệ: thiếu thông tin lớp học.");
  }

  const idArrays = [
    "students",
    "teams",
    "pointActions",
    "rewards",
    "recognitions",
    "classroomRoles",
    "badges",
    "recognitionTitles",
  ] as const;

  for (const field of idArrays) {
    assertEntityArray(record, field, true);
  }

  const historyArrays = [
    "pointHistory",
    "rewardHistory",
    "teamScoreHistory",
    "badgeAwardHistory",
    "luckyWheelHistory",
  ] as const;

  for (const field of historyArrays) {
    assertEntityArray(record, field, true);
  }

  const wheelBag = record.wheelStudentBag;
  if (!Array.isArray(wheelBag)) {
    throw new Error('Định dạng file không hợp lệ: thiếu hoặc sai kiểu mảng "wheelStudentBag".');
  }
  for (let i = 0; i < wheelBag.length; i++) {
    if (typeof wheelBag[i] !== "string") {
      throw new Error(`Định dạng file không hợp lệ: wheelStudentBag[${i}] phải là chuỗi.`);
    }
  }
}

let tauriStorageSingleton: ClassroomDatabaseStorage | null = null;

async function resolveStorage(): Promise<ClassroomDatabaseStorage> {
  if (isTauri()) {
    if (!tauriStorageSingleton) {
      const { TauriFsClassroomStorage } = await import("./storage/tauri-fs.storage");
      tauriStorageSingleton = new TauriFsClassroomStorage();
    }
    return tauriStorageSingleton;
  }
  return new IndexedDbClassroomStorage();
}

async function persistActiveClassroomId(id: string | null): Promise<void> {
  if (id) {
    setLastClassroomId(id);
  }
  const storage = await resolveStorage();
  if (storage.setActiveClassroomId) {
    await storage.setActiveClassroomId(id);
  }
}

export class DatabaseService {
  private storage: ClassroomDatabaseStorage | null = null;
  private storagePromise: Promise<ClassroomDatabaseStorage> | null = null;

  constructor(storage?: ClassroomDatabaseStorage) {
    if (storage) {
      this.storage = storage;
    }
  }

  private async getStorage(): Promise<ClassroomDatabaseStorage> {
    if (this.storage) return this.storage;
    if (!this.storagePromise) {
      this.storagePromise = resolveStorage().then((resolved) => {
        this.storage = resolved;
        return resolved;
      });
    }
    return this.storagePromise;
  }

  /**
   * Called once at app startup.
   * If running inside Tauri: run the one-time migration from IndexedDB → JSON.
   * If running in browser: run the legacy localStorage migration.
   */
  async initializeAndMigrate(): Promise<void> {
    const storage = await this.getStorage();

    if (isTauri()) {
      const { migrateIndexedDbToJson } = await import("./storage/migration.service");
      const result = await migrateIndexedDbToJson(
        storage as InstanceType<typeof import("./storage/tauri-fs.storage").TauriFsClassroomStorage>,
      );

      if (result.status === "completed") {
        console.log(`[DatabaseService] Migration complete. ${result.migratedCount} classroom(s) migrated.`);
      } else if (result.status === "failed") {
        console.error("[DatabaseService] Migration failed:", result.error);
        throw new Error(`Data migration failed: ${result.error}`);
      }
      return;
    }

    const legacyKey = "chibi-classroom-data";
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.classroomSettings && parsed.classroomSettings.className) {
        const newDb = createEmptyDatabase(parsed.classroomSettings);

        newDb.students = parsed.students || [];
        newDb.teams = parsed.teams || [];
        newDb.pointActions = parsed.pointActions || newDb.pointActions;
        newDb.pointHistory = parsed.pointHistory || [];
        newDb.rewards = parsed.rewards || [];
        newDb.rewardHistory = parsed.rewardHistory || [];
        newDb.recognitions = parsed.recognitions || [];
        newDb.luckyWheelHistory = parsed.luckyWheelHistory || [];
        newDb.badgeAwardHistory = parsed.badgeAwardHistory || [];
        newDb.wheelStudentBag = parsed.wheelStudentBag || [];
        newDb.teamScoreHistory = parsed.teamScoreHistory || [];
        newDb.appSettings = parsed.appSettings || newDb.appSettings;

        await storage.save(normalizeClassroomDatabase(newDb));
        localStorage.removeItem(legacyKey);
      }
    } catch (e) {
      console.error("Failed to migrate legacy database", e);
    }
  }

  async listDatabases(): Promise<DatabaseSummary[]> {
    const storage = await this.getStorage();
    return storage.list();
  }

  async createDatabase(
    settings: Omit<ClassroomSettings, "id" | "createdAt" | "updatedAt">,
  ): Promise<ClassroomDatabase> {
    const storage = await this.getStorage();
    const db = normalizeClassroomDatabase(createEmptyDatabase(settings));
    const existing = await storage.load(db.metadata.id);
    if (existing) {
      throw new Error(
        `Lớp "${settings.className}" năm học "${settings.schoolYear}" đã tồn tại. Hãy chọn tên hoặc năm học khác.`,
      );
    }
    await storage.save(db);
    await persistActiveClassroomId(db.metadata.id);
    return db;
  }

  async openDatabase(id: string): Promise<ClassroomDatabase | null> {
    const storage = await this.getStorage();
    const loaded = await storage.load(id);
    if (!loaded) return null;

    let db = loaded;
    if (!db.classroomSettings.teacher) {
      const legacySettings = db.classroomSettings as ClassroomSettings & {
        teacherName?: string;
        teacherAvatar?: string;
      };
      db = {
        ...db,
        classroomSettings: {
          ...db.classroomSettings,
          teacher: {
            id: "teacher-migrated",
            name: legacySettings.teacherName || "Teacher",
            avatar: legacySettings.teacherAvatar,
            createdAt: db.metadata.createdAt,
            updatedAt: db.metadata.updatedAt,
          },
        },
      };
    }

    let normalized = normalizeClassroomDatabase(db);
    const { database: migrated, didMigrate } = await migrateLegacyGiftImages(normalized);
    normalized = migrated;
    if (didMigrate) {
      await storage.save(normalized);
    }
    await persistActiveClassroomId(normalized.metadata.id);
    return normalized;
  }

  async loadDatabase(id: string): Promise<ClassroomDatabase | null> {
    return this.openDatabase(id);
  }

  async saveDatabase(db: ClassroomDatabase): Promise<ClassroomDatabase> {
    const storage = await this.getStorage();
    const normalized = normalizeClassroomDatabase(db);
    const updatedDb: ClassroomDatabase = {
      ...normalized,
      metadata: {
        ...normalized.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    await storage.save(updatedDb);
    return updatedDb;
  }

  async getPreferredClassroomId(): Promise<string | null> {
    const storage = await this.getStorage();
    if (storage.getActiveClassroomId) {
      const fromIndex = await storage.getActiveClassroomId();
      if (fromIndex) return fromIndex;
    }
    return getLastClassroomId();
  }

  async renameClassroomDatabase(
    currentId: string,
    newClassName: string,
    newSchoolYear: string,
  ): Promise<ClassroomDatabase> {
    const storage = await this.getStorage();
    const currentDb = await this.openDatabase(currentId);
    if (!currentDb) throw new Error("Database not found");

    const newId = generateDatabaseId(newClassName, newSchoolYear);
    if (newId === currentId) {
      return currentDb;
    }

    const existingDb = await storage.load(newId);
    if (existingDb) {
      throw new Error(`A database for "${newClassName}" in "${newSchoolYear}" already exists.`);
    }

    const now = new Date().toISOString();
    const updatedDb: ClassroomDatabase = {
      ...currentDb,
      metadata: {
        ...currentDb.metadata,
        id: newId,
        updatedAt: now,
      },
      classroomSettings: {
        ...currentDb.classroomSettings,
        className: newClassName,
        schoolYear: newSchoolYear,
        updatedAt: now,
      },
    };

    await classroomAssetService.copyClassroomGiftImages(
      currentId,
      newId,
      currentDb.rewards ?? [],
    );
    try {
      await storage.save(updatedDb);
    } catch (error) {
      try {
        await classroomAssetService.deleteClassroomAssets(newId);
      } catch (cleanupError) {
        console.warn("[renameClassroomDatabase] failed to clean copied assets", cleanupError);
      }
      throw error;
    }

    const verified = await storage.load(newId);
    if (!verified || verified.metadata.id !== newId) {
      throw new Error("Không thể xác minh lớp học sau khi đổi tên. Vui lòng thử lại.");
    }

    try {
      await storage.delete(currentId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể xóa bản ghi lớp cũ.";
      throw new Error(
        `Lớp mới đã được lưu thành công nhưng không thể xóa bản ghi cũ (${message}). Hãy xóa thủ công lớp cũ trong Cài đặt.`,
      );
    }

    try {
      await classroomAssetService.deleteClassroomAssets(currentId);
    } catch (error) {
      console.warn("[renameClassroomDatabase] failed to remove old classroom assets", error);
    }

    await persistActiveClassroomId(newId);
    return updatedDb;
  }

  async duplicateDatabase(
    sourceId: string,
    newClassName: string,
    newSchoolYear: string,
    mode: "settings-only" | "full-copy",
  ): Promise<ClassroomDatabase> {
    const storage = await this.getStorage();
    const sourceDb = await this.openDatabase(sourceId);
    if (!sourceDb) throw new Error("Source database not found");

    const newId = generateDatabaseId(newClassName, newSchoolYear);
    const existingDb = await storage.load(newId);
    if (existingDb) {
      throw new Error(`A database for "${newClassName}" in "${newSchoolYear}" already exists.`);
    }

    const now = new Date().toISOString();
    let newDb: ClassroomDatabase;

    if (mode === "settings-only") {
      newDb = createEmptyDatabase({
        className: newClassName,
        schoolYear: newSchoolYear,
        classAvatar: sourceDb.classroomSettings.classAvatar,
        homeBannerImage: sourceDb.classroomSettings.homeBannerImage,
        teacher: sourceDb.classroomSettings.teacher,
      });
      newDb.pointActions = sourceDb.pointActions;
      newDb.rewards = sourceDb.rewards;
      newDb.classroomRoles = sourceDb.classroomRoles ?? newDb.classroomRoles;
      newDb.badges = sourceDb.badges ?? newDb.badges;
      newDb.recognitionTitles = sourceDb.recognitionTitles ?? newDb.recognitionTitles;
      newDb.appSettings = sourceDb.appSettings;
    } else {
      newDb = {
        ...sourceDb,
        metadata: {
          id: newId,
          version: sourceDb.metadata.version,
          createdAt: now,
          updatedAt: now,
        },
        classroomSettings: {
          ...sourceDb.classroomSettings,
          className: newClassName,
          schoolYear: newSchoolYear,
          updatedAt: now,
        },
      };
    }

    await classroomAssetService.copyClassroomGiftImages(sourceId, newId, newDb.rewards ?? []);
    try {
      await storage.save(newDb);
    } catch (error) {
      try {
        await classroomAssetService.deleteClassroomAssets(newId);
      } catch (cleanupError) {
        console.warn("[duplicateDatabase] failed to clean copied assets", cleanupError);
      }
      throw error;
    }

    await persistActiveClassroomId(newDb.metadata.id);
    return newDb;
  }

  async deleteDatabase(id: string): Promise<void> {
    const storage = await this.getStorage();
    await storage.delete(id);
    try {
      await classroomAssetService.deleteClassroomAssets(id);
    } catch (error) {
      console.warn("[deleteDatabase] failed to remove classroom assets", error);
    }
    const activeId = await this.getPreferredClassroomId();
    if (activeId === id) {
      const remaining = await storage.list();
      await persistActiveClassroomId(remaining[0]?.id ?? null);
    }
  }

  private async importParsedDatabase(data: unknown): Promise<ClassroomDatabase> {
    const record = data as Record<string, unknown>;
    const classroomData =
      record.payload && typeof record.payload === "object" ? record.payload : data;

    assertImportShape(classroomData);

    const db = normalizeClassroomDatabase(classroomData);
    const storage = await this.getStorage();
    const existing = await storage.load(db.metadata.id);
    if (existing) {
      throw new Error(
        `Đã có lớp "${existing.classroomSettings.className}" (${existing.classroomSettings.schoolYear}) với cùng mã dữ liệu. Hãy xóa lớp cũ hoặc chỉnh tên lớp/năm học trong file trước khi nhập.`,
      );
    }
    const saved = await this.saveDatabase(db);
    await persistActiveClassroomId(saved.metadata.id);
    return saved;
  }

  async importDatabaseFromJson(data: unknown): Promise<ClassroomDatabase> {
    return this.importParsedDatabase(data);
  }

  async importDatabase(file: File): Promise<ClassroomDatabase> {
    assertImportFileSize(file);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          const saved = await this.importParsedDatabase(data);
          resolve(saved);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  async exportDatabase(db: ClassroomDatabase): Promise<void> {
    const json = JSON.stringify(db, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const filename = generateExportFilename(db.classroomSettings.className, db.classroomSettings.schoolYear);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async getDataDirectory(): Promise<string | null> {
    if (!isTauri()) return null;
    const storage = await this.getStorage();
    if (storage.getDataDirectory) {
      return storage.getDataDirectory();
    }
    return null;
  }

  async closeDatabase(): Promise<void> {
    await persistActiveClassroomId(null);
  }
}

export const databaseService = new DatabaseService();
