import type { FileStorageAdapter } from "../storage/storage.interface";

const DB_NAME = "ClassroomAssets";
const DB_VERSION = 1;
const STORE_NAME = "assets";

function assetKey(classroomId: string, relativePath: string): string {
  return `${classroomId}::${relativePath}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export class IndexedDbAssetAdapter implements Pick<
  FileStorageAdapter,
  "readBinaryFile" | "writeBinaryFile" | "removeFile" | "removeDir" | "renamePath" | "fileExists"
> {
  async readBinaryFile(path: string): Promise<Uint8Array> {
    const [classroomId, ...rest] = path.split("::");
    const relativePath = rest.join("::");
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(assetKey(classroomId, relativePath));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const value = request.result as ArrayBuffer | undefined;
        resolve(value ? new Uint8Array(value) : new Uint8Array());
      };
    });
  }

  async writeBinaryFile(path: string, contents: Uint8Array): Promise<void> {
    const [classroomId, ...rest] = path.split("::");
    const relativePath = rest.join("::");
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(
        contents.buffer.slice(contents.byteOffset, contents.byteOffset + contents.byteLength),
        assetKey(classroomId, relativePath),
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async removeFile(path: string): Promise<void> {
    const [classroomId, ...rest] = path.split("::");
    const relativePath = rest.join("::");
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(assetKey(classroomId, relativePath));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async removeDir(path: string): Promise<void> {
    const classroomId = path;
    const db = await openDb();
    const prefix = `${classroomId}::`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const keys = (request.result as string[]).filter((key) => key.startsWith(prefix));
        for (const key of keys) {
          store.delete(key);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async renamePath(from: string, to: string): Promise<void> {
    const fromPrefix = `${from}::`;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const keys = (request.result as string[]).filter((key) => key.startsWith(fromPrefix));
        for (const key of keys) {
          const relative = key.slice(fromPrefix.length);
          const getReq = store.get(key);
          getReq.onerror = () => reject(getReq.error);
          getReq.onsuccess = () => {
            const value = getReq.result as ArrayBuffer | undefined;
            if (value) {
              store.put(value, assetKey(to, relative));
            }
            store.delete(key);
          };
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async fileExists(path: string): Promise<boolean> {
    const [classroomId, ...rest] = path.split("::");
    const relativePath = rest.join("::");
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(assetKey(classroomId, relativePath));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result !== undefined);
    });
  }
}

export function webAssetStorageKey(classroomId: string, relativePath: string): string {
  return `${classroomId}::${relativePath}`;
}
