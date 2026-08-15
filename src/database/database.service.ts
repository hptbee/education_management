import type { ClassroomDatabase, DatabaseSummary } from "./types";
import type { ClassroomDatabaseStorage } from "./storage/storage.interface";
import { IndexedDbClassroomStorage } from "./storage/indexed-db.storage";
import { createEmptyDatabase } from "./database.factory";
import { generateDatabaseId, generateExportFilename } from "./database.utils";
import { normalizeClassroomDatabase } from "../utils/classroomRoles";
import type { ClassroomSettings } from "../types/models";
import { isTauri } from "./tauri-fs.service";

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
      }
    } catch (e) {
      console.error("Failed to migrate legacy database", e);
    } finally {
      localStorage.removeItem(legacyKey);
    }
  }

  async listDatabases(): Promise<DatabaseSummary[]> {
    return this.storage.list();
  }

  async createDatabase(
    settings: Omit<ClassroomSettings, "id" | "createdAt" | "updatedAt">
  ): Promise<ClassroomDatabase> {
    const db = normalizeClassroomDatabase(createEmptyDatabase(settings));
    await this.storage.save(db);
    return db;
  }

  async openDatabase(id: string): Promise<ClassroomDatabase | null> {
    const db = await this.storage.load(id);
    if (!db) return null;

    if (!db.classroomSettings.teacher) {
      // Backwards compatibility for old databases
      const legacySettings = db.classroomSettings as any;
      db.classroomSettings.teacher = {
        id: "teacher-migrated",
        name: legacySettings.teacherName || "Teacher",
        avatar: legacySettings.teacherAvatar,
        createdAt: db.metadata.createdAt,
        updatedAt: db.metadata.updatedAt,
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
    await this.storage.delete(currentId);

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
        teacher: sourceDb.classroomSettings.teacher,
      });
      newDb.pointActions = sourceDb.pointActions;
      newDb.rewards = sourceDb.rewards;
      newDb.classroomRoles = sourceDb.classroomRoles ?? newDb.classroomRoles;
      newDb.badges = sourceDb.badges ?? newDb.badges;
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);

          if (!data.metadata || !data.metadata.id || !data.classroomSettings) {
            throw new Error("Invalid database format: Missing metadata or classroom information");
          }

          const db = normalizeClassroomDatabase(data as ClassroomDatabase);
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
