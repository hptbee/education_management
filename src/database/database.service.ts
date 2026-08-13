import type { ClassroomDatabase, DatabaseSummary } from "./types";
import type { ClassroomDatabaseStorage } from "./storage/storage.interface";
import { IndexedDbClassroomStorage } from "./storage/indexed-db.storage";
import { createEmptyDatabase } from "./database.factory";
import { generateDatabaseId, generateExportFilename } from "./database.utils";
import type { ClassroomSettings } from "../types/models";

export class DatabaseService {
  private storage: ClassroomDatabaseStorage;

  constructor(storage?: ClassroomDatabaseStorage) {
    this.storage = storage || new IndexedDbClassroomStorage();
  }

  async initializeAndMigrate(): Promise<void> {
    const legacyKey = "chibi-classroom-data";
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.classroomSettings && parsed.classroomSettings.className) {
        // Create new database based on legacy settings
        const newDb = createEmptyDatabase(parsed.classroomSettings);
        
        // Merge legacy data
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

        await this.storage.save(newDb);
      }
    } catch (e) {
      console.error("Failed to migrate legacy database", e);
    } finally {
      localStorage.removeItem(legacyKey); // Prevent double migration
    }
  }

  async listDatabases(): Promise<DatabaseSummary[]> {
    return this.storage.list();
  }

  async createDatabase(
    settings: Omit<ClassroomSettings, "id" | "createdAt" | "updatedAt">
  ): Promise<ClassroomDatabase> {
    const db = createEmptyDatabase(settings);
    await this.storage.save(db);
    return db;
  }

  async openDatabase(id: string): Promise<ClassroomDatabase | null> {
    const db = await this.storage.load(id);
    if (db && !db.classroomSettings.teacher) {
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
    return db;
  }

  async loadDatabase(id: string): Promise<ClassroomDatabase | null> {
    return this.openDatabase(id);
  }

  async saveDatabase(db: ClassroomDatabase): Promise<ClassroomDatabase> {
    const updatedDb: ClassroomDatabase = {
      ...db,
      metadata: {
        ...db.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    await this.storage.save(updatedDb);
    return updatedDb;
  }

  async renameClassroomDatabase(currentId: string, newClassName: string, newSchoolYear: string): Promise<ClassroomDatabase> {
    const currentDb = await this.openDatabase(currentId);
    if (!currentDb) throw new Error("Database not found");

    const newId = generateDatabaseId(newClassName, newSchoolYear);
    if (newId === currentId) {
      // Nothing to rename, maybe just updating other settings
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
          
          const db = data as ClassroomDatabase;
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

  async closeDatabase(): Promise<void> {
    // Could clean up current active state if managed internally
  }
}

export const databaseService = new DatabaseService();
