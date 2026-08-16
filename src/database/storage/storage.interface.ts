import type { ClassroomDatabase, DatabaseSummary } from "../types";

export interface FileStorageAdapter {
  getDataDirectory(): Promise<string>;
  ensureDir(path: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contents: string): Promise<void>;
  readBinaryFile(path: string): Promise<Uint8Array>;
  writeBinaryFile(path: string, contents: Uint8Array): Promise<void>;
  removeFile(path: string): Promise<void>;
  removeDir(path: string): Promise<void>;
  renamePath(from: string, to: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  listDir(path: string): Promise<string[]>;
  joinPath(...parts: string[]): string;
  openPath?(path: string): Promise<void>;
}

export interface ClassroomDatabaseStorage {
  load(id: string): Promise<ClassroomDatabase | null>;
  save(database: ClassroomDatabase): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<DatabaseSummary[]>;
  setActiveClassroomId?(id: string | null): Promise<void>;
  getActiveClassroomId?(): Promise<string | null>;
  ensureEmptyIndex?(): Promise<void>;
  isInitialized?(): Promise<boolean>;
  isMigrationComplete?(): Promise<boolean>;
  markMigrationComplete?(): Promise<void>;
  getDataDirectory?(): Promise<string>;
}
