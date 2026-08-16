/**
 * TauriFsClassroomStorage
 * Implements ClassroomDatabaseStorage using JSON files stored in the Tauri app data directory.
 *
 * Directory layout:
 *   AppData/ClassroomManagement/
 *     index.json                     ← lightweight list of all classrooms
 *     classrooms/
 *       Lop-2-7_2026-2027.json       ← full ClassroomDatabase for each classroom
 *
 * All writes are safe: Rust backend uses a temp-file rename strategy.
 * A write queue prevents concurrent writes from racing each other.
 */

import type { ClassroomDatabase, DatabaseSummary } from "../types";
import { makeClassroomFileName } from "../database.utils";
import type { ClassroomDatabaseStorage, FileStorageAdapter } from "./storage.interface";
import { tauriFs } from "../tauri-fs.service";
import { enqueueWrite } from "./write-queue";

// ─── INDEX FILE TYPES ────────────────────────────────────────────────────────

export interface ClassroomIndexEntry {
  id: string;
  fileName: string;
  className: string;
  schoolYear: string;
  teacherName: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IndexFile {
  version: 1;
  activeClassroomId?: string | null;
  classrooms: ClassroomIndexEntry[];
}

export const EMPTY_INDEX: IndexFile = { version: 1, activeClassroomId: null, classrooms: [] };

export const MIGRATION_COMPLETE_MARKER = "indexeddb-migration.complete";

function entryFromDatabase(db: ClassroomDatabase, fileName: string): ClassroomIndexEntry {
  return {
    id: db.metadata.id,
    fileName,
    className: db.classroomSettings.className,
    schoolYear: db.classroomSettings.schoolYear,
    teacherName: db.classroomSettings.teacher?.name ?? "Teacher",
    studentCount: db.students.length,
    createdAt: db.metadata.createdAt,
    updatedAt: db.metadata.updatedAt,
  };
}

function parseIndexFile(text: string): IndexFile {
  const parsed = JSON.parse(text) as IndexFile;
  if (parsed.version !== 1 || !Array.isArray(parsed.classrooms)) {
    throw new Error("Invalid index format");
  }
  return {
    version: 1,
    activeClassroomId: parsed.activeClassroomId ?? null,
    classrooms: parsed.classrooms,
  };
}

// ─── STORAGE IMPLEMENTATION ──────────────────────────────────────────────────

export class TauriFsClassroomStorage implements ClassroomDatabaseStorage {
  private dataDir = "";
  private classroomsDir = "";
  private indexPath = "";
  private migrationMarkerPath = "";
  private initialized = false;
  private readonly fs: FileStorageAdapter;

  /** Serial write queue — prevents concurrent writes from racing */
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(fs: FileStorageAdapter = tauriFs) {
    this.fs = fs;
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.dataDir = await this.fs.getDataDirectory();
    this.classroomsDir = this.fs.joinPath(this.dataDir, "classrooms");
    this.indexPath = this.fs.joinPath(this.dataDir, "index.json");
    this.migrationMarkerPath = this.fs.joinPath(this.dataDir, MIGRATION_COMPLETE_MARKER);

    await this.fs.ensureDir(this.dataDir);
    await this.fs.ensureDir(this.classroomsDir);

    this.initialized = true;
  }

  // ── Index helpers ───────────────────────────────────────────────────────────

  private async rebuildIndexFromClassrooms(): Promise<IndexFile> {
    const names = await this.fs.listDir(this.classroomsDir);
    const classrooms: ClassroomIndexEntry[] = [];

    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      try {
        const text = await this.fs.readTextFile(this.classroomFilePath(name));
        const db = JSON.parse(text) as ClassroomDatabase;
        if (!db?.metadata?.id) continue;
        classrooms.push(entryFromDatabase(db, name));
      } catch {
        // Skip unreadable classroom files during recovery.
      }
    }

    return { version: 1, activeClassroomId: null, classrooms };
  }

  private async readIndex(): Promise<IndexFile> {
    const exists = await this.fs.fileExists(this.indexPath);
    if (!exists) {
      return this.rebuildIndexFromClassrooms();
    }

    const text = await this.fs.readTextFile(this.indexPath);
    if (!text.trim()) {
      return this.rebuildIndexFromClassrooms();
    }

    return parseIndexFile(text);
  }

  private async reconcileIndex(index: IndexFile): Promise<IndexFile> {
    const rebuilt = await this.rebuildIndexFromClassrooms();
    const knownIds = new Set(index.classrooms.map((entry) => entry.id));
    let changed = false;

    for (const entry of rebuilt.classrooms) {
      if (knownIds.has(entry.id)) continue;
      index.classrooms.push(entry);
      knownIds.add(entry.id);
      changed = true;
    }

    if (changed) {
      await this.writeIndex(index);
    }

    return index;
  }

  private async readIndexWithRecovery(): Promise<IndexFile> {
    try {
      const index = await this.readIndex();
      return await this.reconcileIndex(index);
    } catch {
      const rebuilt = await this.rebuildIndexFromClassrooms();
      const index: IndexFile = {
        version: 1,
        activeClassroomId: null,
        classrooms: rebuilt.classrooms,
      };
      if (rebuilt.classrooms.length > 0) {
        await this.writeIndex(index);
      }
      return index;
    }
  }

  private async readIndexOrThrow(): Promise<IndexFile> {
    try {
      return await this.readIndex();
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      throw new Error(`index.json is missing or corrupt: ${message}`);
    }
  }

  private async writeIndex(index: IndexFile): Promise<void> {
    await this.fs.writeTextFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  private classroomFilePath(fileName: string): string {
    return this.fs.joinPath(this.classroomsDir, fileName);
  }

  private resolveFileName(db: ClassroomDatabase, existingFileName?: string): string {
    if (existingFileName) return existingFileName;
    return makeClassroomFileName(db.metadata.id);
  }

  // ── ClassroomDatabaseStorage interface ─────────────────────────────────────

  async list(): Promise<DatabaseSummary[]> {
    await this.initialize();
    const index = await this.readIndexWithRecovery();

    return index.classrooms
      .map((entry) => ({
        id: entry.id,
        className: entry.className,
        schoolYear: entry.schoolYear,
        teacherName: entry.teacherName,
        studentCount: entry.studentCount,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async load(id: string): Promise<ClassroomDatabase | null> {
    await this.initialize();
    const index = await this.readIndexWithRecovery();

    const entry = index.classrooms.find((c) => c.id === id);
    if (!entry) return null;

    try {
      const text = await this.fs.readTextFile(this.classroomFilePath(entry.fileName));
      return JSON.parse(text) as ClassroomDatabase;
    } catch {
      return null;
    }
  }

  async save(db: ClassroomDatabase): Promise<void> {
    await this.initialize();

    const { nextQueue, result } = enqueueWrite(this.writeQueue, async () => {
      const index = await this.readIndexWithRecovery();
      const existingIdx = index.classrooms.findIndex((c) => c.id === db.metadata.id);
      const existingFileName = existingIdx >= 0 ? index.classrooms[existingIdx].fileName : undefined;
      const fileName = this.resolveFileName(db, existingFileName);
      const filePath = this.classroomFilePath(fileName);

      await this.fs.writeTextFile(filePath, JSON.stringify(db, null, 2));

      const entry = entryFromDatabase(db, fileName);

      if (existingIdx >= 0) {
        index.classrooms[existingIdx] = entry;
      } else {
        index.classrooms.push(entry);
      }

      try {
        await this.writeIndex(index);
      } catch (error) {
        throw new Error(
          `Classroom saved but index update failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    });
    this.writeQueue = nextQueue;
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.initialize();

    const { nextQueue, result } = enqueueWrite(this.writeQueue, async () => {
      const index = await this.readIndexWithRecovery();
      const entry = index.classrooms.find((c) => c.id === id);

      if (entry) {
        await this.fs.removeFile(this.classroomFilePath(entry.fileName));
        index.classrooms = index.classrooms.filter((c) => c.id !== id);
        if (index.activeClassroomId === id) {
          index.activeClassroomId = index.classrooms[0]?.id ?? null;
        }
        await this.writeIndex(index);
      }
    });
    this.writeQueue = nextQueue;
    return result;
  }

  async setActiveClassroomId(id: string | null): Promise<void> {
    await this.initialize();

    const { nextQueue, result } = enqueueWrite(this.writeQueue, async () => {
      const index = await this.readIndexWithRecovery();
      index.activeClassroomId = id;
      await this.writeIndex(index);
    });
    this.writeQueue = nextQueue;
    return result;
  }

  async getActiveClassroomId(): Promise<string | null> {
    await this.initialize();
    const index = await this.readIndexWithRecovery();
    return index.activeClassroomId ?? null;
  }

  async ensureEmptyIndex(): Promise<void> {
    await this.initialize();
    if (await this.fs.fileExists(this.indexPath)) return;
    const rebuilt = await this.rebuildIndexFromClassrooms();
    if (rebuilt.classrooms.length > 0) {
      await this.writeIndex(rebuilt);
      return;
    }
    await this.writeIndex({ ...EMPTY_INDEX });
  }

  /** Returns whether the index.json file already exists (migration check) */
  async isInitialized(): Promise<boolean> {
    await this.initialize();
    return this.fs.fileExists(this.indexPath);
  }

  async isMigrationComplete(): Promise<boolean> {
    await this.initialize();
    return this.fs.fileExists(this.migrationMarkerPath);
  }

  async markMigrationComplete(): Promise<void> {
    await this.initialize();
    await this.fs.writeTextFile(this.migrationMarkerPath, new Date().toISOString());
  }

  /** Returns the data directory path for the "open folder" feature */
  async getDataDirectory(): Promise<string> {
    await this.initialize();
    return this.dataDir;
  }
}
