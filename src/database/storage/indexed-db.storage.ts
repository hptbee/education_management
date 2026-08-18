import type { ClassroomDatabase, DatabaseSummary } from "../types";
import { createEmptyDatabase } from "../database.factory";
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
      archived: dbItem.metadata.archived ?? false,
      hydrated: !dbItem.metadata.cloudStub,
    }));

    summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return summaries;
  }

  async mergeRegistryStubs(
    entries: Array<{
      key: string;
      name: string;
      schoolYear: string;
      createdAt: string;
      updatedAt: string;
      archived?: boolean;
    }>,
  ): Promise<void> {
    const { nextQueue, result } = enqueueWrite(this.writeQueue, async () => {
      const db = await this.getDB();
      const databases = await runTransaction<ClassroomDatabase[]>(db, "readonly", (store) => store.getAll());

      for (const registryEntry of entries) {
        const existing = databases.find((item) => item.metadata.id === registryEntry.key);
        if (existing && !existing.metadata.cloudStub) {
          const remoteTime = new Date(registryEntry.updatedAt).getTime();
          const localTime = new Date(existing.metadata.updatedAt).getTime();
          if (remoteTime > localTime) {
            const updated: ClassroomDatabase = {
              ...existing,
              metadata: {
                ...existing.metadata,
                updatedAt: registryEntry.updatedAt,
                archived: registryEntry.archived ?? existing.metadata.archived,
              },
              classroomSettings: {
                ...existing.classroomSettings,
                className: registryEntry.name,
                schoolYear: registryEntry.schoolYear,
                updatedAt: registryEntry.updatedAt,
              },
            };
            await runTransaction(db, "readwrite", (store) => store.put(updated));
          }
          continue;
        }

        const stub = createEmptyDatabase({
          className: registryEntry.name,
          schoolYear: registryEntry.schoolYear,
          teacher: {
            id: "cloud-stub",
            name: "—",
            createdAt: registryEntry.createdAt,
            updatedAt: registryEntry.updatedAt,
          },
        });
        stub.metadata = {
          ...stub.metadata,
          id: registryEntry.key,
          createdAt: registryEntry.createdAt,
          updatedAt: registryEntry.updatedAt,
          archived: registryEntry.archived ?? false,
          cloudStub: true,
        };
        await runTransaction(db, "readwrite", (store) => store.put(stub));
      }
    });
    this.writeQueue = nextQueue;
    return result;
  }

  async isClassroomHydrated(id: string): Promise<boolean> {
    const db = await this.getDB();
    const item = await runTransaction<ClassroomDatabase | undefined>(db, "readonly", (store) => store.get(id));
    if (!item) return false;
    return !item.metadata.cloudStub;
  }
}
