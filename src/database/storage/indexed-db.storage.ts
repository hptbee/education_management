import type { ClassroomDatabase, DatabaseSummary } from "../types";
import type { ClassroomDatabaseStorage } from "./storage.interface";

const DB_NAME = "ClassroomDatabases";
const DB_VERSION = 1;
const STORE_NAME = "databases";

export class IndexedDbClassroomStorage implements ClassroomDatabaseStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "metadata.id" });
        }
      };
    });

    return this.dbPromise;
  }

  async load(id: string): Promise<ClassroomDatabase | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async save(database: ClassroomDatabase): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(database);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async list(): Promise<DatabaseSummary[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const databases = request.result as ClassroomDatabase[];
        const summaries = databases.map((db) => ({
          id: db.metadata.id,
          className: db.classroomSettings.className,
          schoolYear: db.classroomSettings.schoolYear,
          teacherName: db.classroomSettings.teacher?.name || (db.classroomSettings as any).teacherName || "Teacher",
          studentCount: db.students.length,
          createdAt: db.metadata.createdAt,
          updatedAt: db.metadata.updatedAt,
        }));
        
        // Sort by updatedAt descending
        summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        resolve(summaries);
      };
    });
  }
}
