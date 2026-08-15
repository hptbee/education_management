import type { ClassroomDatabase, DatabaseSummary } from "../types";
import type { ClassroomDatabaseStorage } from "./storage.interface";
import { enqueueWrite } from "./write-queue";

const DB_NAME = "ClassroomDatabases";
const DB_VERSION = 1;
const STORE_NAME = "databases";

function runTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = run(store);

    request.onerror = () => reject(request.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.oncomplete = () => resolve(request.result);
  });
}

export class IndexedDbClassroomStorage implements ClassroomDatabaseStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  /** Serial write queue — prevents concurrent puts from racing */
  private writeQueue: Promise<void> = Promise.resolve();

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
    const result = await runTransaction(db, "readonly", (store) => store.get(id));
    return result || null;
  }

  async save(database: ClassroomDatabase): Promise<void> {
    const { nextQueue, result } = enqueueWrite(this.writeQueue, async () => {
      const db = await this.getDB();
      await runTransaction(db, "readwrite", (store) => store.put(database));
    });
    this.writeQueue = nextQueue;
    return result;
  }

  async delete(id: string): Promise<void> {
    const { nextQueue, result } = enqueueWrite(this.writeQueue, async () => {
      const db = await this.getDB();
      await runTransaction(db, "readwrite", (store) => store.delete(id));
    });
    this.writeQueue = nextQueue;
    return result;
  }

  async list(): Promise<DatabaseSummary[]> {
    const db = await this.getDB();
    const databases = await runTransaction<ClassroomDatabase[]>(db, "readonly", (store) => store.getAll());
    const summaries = databases.map((dbItem) => ({
      id: dbItem.metadata.id,
      className: dbItem.classroomSettings.className,
      schoolYear: dbItem.classroomSettings.schoolYear,
      teacherName:
        dbItem.classroomSettings.teacher?.name ||
        (dbItem.classroomSettings as { teacherName?: string }).teacherName ||
        "Teacher",
      studentCount: dbItem.students.length,
      createdAt: dbItem.metadata.createdAt,
      updatedAt: dbItem.metadata.updatedAt,
    }));

    summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return summaries;
  }
}
