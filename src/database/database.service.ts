import type { ClassroomDatabase, DatabaseSummary } from "./types";
import type { ClassroomDatabaseStorage } from "./storage/storage.interface";
import { IndexedDbClassroomStorage } from "./storage/indexed-db.storage";
import { createEmptyDatabase } from "./database.factory";
import { generateDatabaseId, generateExportFilename } from "./database.utils";
import { normalizeClassroomDatabase } from "../utils/classroomRoles";
import type { ClassroomSettings } from "../types/models";
import { isTauri } from "./tauri-fs.service";
import { assertImportFileSize } from "./importLimits";

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
  if (!settings?.className || typeof settings.className !== "string") {
    throw new Error("Định dạng file không hợp lệ: thiếu thông tin lớp học.");
  }

  const arrayFields = [
    "students",
    "teams",
    "pointActions",
    "pointHistory",
    "rewards",
    "rewardHistory",
    "recognitions",
    "teamScoreHistory",
    "classroomRoles",
    "badges",
    "recognitionTitles",
  ] as const;

  for (const field of arrayFields) {
    if (!Array.isArray(record[field])) {
      throw new Error(`Định dạng file không hợp lệ: thiếu hoặc sai kiểu mảng "${field}".`);
    }
  }
}

function createStorage(): ClassroomDatabaseStorage {
  if (isTauri()) {
    // Dynamic import — keeps Tauri code out of the browser bundle
    // We return a lazy proxy that will initialize on first use.
    // Since all storage methods are async, this is safe.
    const { TauriFsClassroomStorage } = require("./storage/tauri-fs.storage") as typeof import("./storage/tauri-fs.storage");
    return new TauriFsClassroomStorage();
  }
  return new IndexedDbClassroomStorage();
}

export class DatabaseService {
  private storage: ClassroomDatabaseStorage;

  constructor(storage?: ClassroomDatabaseStorage) {
    this.storage = storage || createStorage();
  }

  /**
   * Called once at app startup.
   * If running inside Tauri: run the one-time migration from IndexedDB → JSON.
   * If running in browser: run the legacy localStorage migration.
   */
  async initializeAndMigrate(): Promise<void> {
    if (isTauri()) {
      const { TauriFsClassroomStorage } = await import("./storage/tauri-fs.storage");
      const { migrateIndexedDbToJson } = await import("./storage/migration.service");

      const tauriStorage = this.storage as InstanceType<typeof TauriFsClassroomStorage>;
      const result = await migrateIndexedDbToJson(tauriStorage);

      if (result.status === "completed") {
        console.log(`[DatabaseService] Migration complete. ${result.migratedCount} classroom(s) migrated.`);
      } else if (result.status === "failed") {
        console.error("[DatabaseService] Migration failed:", result.error);
        // Rethrow so the UI can show an error
        throw new Error(`Data migration failed: ${result.error}`);
      }
      return;
    }

    // Legacy browser migration: localStorage → IndexedDB
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
        newDb.wheelStudentBag = parsed.wheelStudentBag || [];
        newDb.teamScoreHistory = parsed.teamScoreHistory || [];
        newDb.appSettings = parsed.appSettings || newDb.appSettings;

        await this.storage.save(normalizeClassroomDatabase(newDb));
        localStorage.removeItem(legacyKey);
      }
    } catch (e) {
      console.error("Failed to migrate legacy database", e);
    }
  }

  async listDatabases(): Promise<DatabaseSummary[]> {
    return this.storage.list();
  }

  async createDatabase(
    settings: Omit<ClassroomSettings, "id" | "createdAt" | "updatedAt">
  ): Promise<ClassroomDatabase> {
    const db = normalizeClassroomDatabase(createEmptyDatabase(settings));
    const existing = await this.storage.load(db.metadata.id);
    if (existing) {
      throw new Error(
        `Lớp "${settings.className}" năm học "${settings.schoolYear}" đã tồn tại. Hãy chọn tên hoặc năm học khác.`,
      );
    }
    await this.storage.save(db);
    return db;
  }

  async openDatabase(id: string): Promise<ClassroomDatabase | null> {
    const loaded = await this.storage.load(id);
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

    return normalizeClassroomDatabase(db);
  }

  async loadDatabase(id: string): Promise<ClassroomDatabase | null> {
    return this.openDatabase(id);
  }

  async saveDatabase(db: ClassroomDatabase): Promise<ClassroomDatabase> {
    const normalized = normalizeClassroomDatabase(db);
    const updatedDb: ClassroomDatabase = {
      ...normalized,
      metadata: {
        ...normalized.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    await this.storage.save(updatedDb);
    return updatedDb;
  }

  async renameClassroomDatabase(
    currentId: string,
    newClassName: string,
    newSchoolYear: string
  ): Promise<ClassroomDatabase> {
    const currentDb = await this.openDatabase(currentId);
    if (!currentDb) throw new Error("Database not found");

    const newId = generateDatabaseId(newClassName, newSchoolYear);
    if (newId === currentId) {
      return currentDb;
    }

    const existingDb = await this.storage.load(newId);
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

    await this.storage.save(updatedDb);
    const verified = await this.storage.load(newId);
    if (!verified || verified.metadata.id !== newId) {
      throw new Error("Không thể xác minh lớp học sau khi đổi tên. Vui lòng thử lại.");
    }

    try {
      await this.storage.delete(currentId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể xóa bản ghi lớp cũ.";
      throw new Error(
        `Lớp mới đã được lưu thành công nhưng không thể xóa bản ghi cũ (${message}). Hãy xóa thủ công lớp cũ trong Cài đặt.`,
      );
    }

    return updatedDb;
  }

  async duplicateDatabase(
    sourceId: string,
    newClassName: string,
    newSchoolYear: string,
    mode: "settings-only" | "full-copy"
  ): Promise<ClassroomDatabase> {
    const sourceDb = await this.openDatabase(sourceId);
    if (!sourceDb) throw new Error("Source database not found");

    const newId = generateDatabaseId(newClassName, newSchoolYear);
    const existingDb = await this.storage.load(newId);
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

    await this.storage.save(newDb);
    return newDb;
  }

  async deleteDatabase(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  async importDatabase(file: File): Promise<ClassroomDatabase> {
    assertImportFileSize(file);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);

          assertImportShape(data);

          const db = normalizeClassroomDatabase(data);
          const existing = await this.storage.load(db.metadata.id);
          if (existing) {
            throw new Error(
              `Đã có lớp "${existing.classroomSettings.className}" (${existing.classroomSettings.schoolYear}) với cùng mã dữ liệu. Hãy xóa lớp cũ hoặc chỉnh tên lớp/năm học trong file trước khi nhập.`,
            );
          }
          await this.saveDatabase(db);
          resolve(db);
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

  /**
   * Returns the Tauri data directory path (only available in Tauri mode).
   * Used by the Settings page "Open Data Folder" button.
   */
  async getDataDirectory(): Promise<string | null> {
    if (!isTauri()) return null;
    const { TauriFsClassroomStorage } = await import("./storage/tauri-fs.storage");
    if (this.storage instanceof TauriFsClassroomStorage) {
      return (this.storage as InstanceType<typeof TauriFsClassroomStorage>).getDataDirectory();
    }
    return null;
  }

  async closeDatabase(): Promise<void> {
    // Cleanup if needed
  }
}

export const databaseService = new DatabaseService();
