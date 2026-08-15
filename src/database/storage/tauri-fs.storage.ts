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

// ─── STORAGE IMPLEMENTATION ──────────────────────────────────────────────────

export class TauriFsClassroomStorage implements ClassroomDatabaseStorage {
  private dataDir = "";
  private classroomsDir = "";
  private indexPath = "";
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

    await this.fs.ensureDir(this.dataDir);
    await this.fs.ensureDir(this.classroomsDir);

    this.initialized = true;
  }

  // ── Index helpers ───────────────────────────────────────────────────────────

  private async readIndex(): Promise<IndexFile> {
    try {
      const text = await this.fs.readTextFile(this.indexPath);
      const parsed = JSON.parse(text) as IndexFile;
      return {
        version: 1,
        activeClassroomId: parsed.activeClassroomId ?? null,
        classrooms: Array.isArray(parsed.classrooms) ? parsed.classrooms : [],
      };
    } catch {
      return { ...EMPTY_INDEX };
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
    const index = await this.readIndex();
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
    const index = await this.readIndex();
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
      const index = await this.readIndex();
      const existingIdx = index.classrooms.findIndex((c) => c.id === db.metadata.id);
      const existingFileName = existingIdx >= 0 ? index.classrooms[existingIdx].fileName : undefined;
      const fileName = this.resolveFileName(db, existingFileName);
      const filePath = this.classroomFilePath(fileName);

      await this.fs.writeTextFile(filePath, JSON.stringify(db, null, 2));

      const entry: ClassroomIndexEntry = {
        id: db.metadata.id,
        fileName,
        className: db.classroomSettings.className,
        schoolYear: db.classroomSettings.schoolYear,
        teacherName: db.classroomSettings.teacher?.name ?? "Teacher",
        studentCount: db.students.length,
        createdAt: db.metadata.createdAt,
        updatedAt: db.metadata.updatedAt,
      };

      if (existingIdx >= 0) {
        index.classrooms[existingIdx] = entry;
      } else {
        index.classrooms.push(entry);
      }

      await this.writeIndex(index);
    });
    this.writeQueue = nextQueue;
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.initialize();

    const { nextQueue, result } = enqueueWrite(this.writeQueue, async () => {
      const index = await this.readIndex();
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
      const index = await this.readIndex();
      index.activeClassroomId = id;
      await this.writeIndex(index);
    });
    this.writeQueue = nextQueue;
    return result;
  }

  async getActiveClassroomId(): Promise<string | null> {
    await this.initialize();
    const index = await this.readIndex();
    return index.activeClassroomId ?? null;
  }

  async ensureEmptyIndex(): Promise<void> {
    await this.initialize();
    if (await this.fs.fileExists(this.indexPath)) return;
    await this.writeIndex({ ...EMPTY_INDEX });
  }

  /** Returns whether the index.json file already exists (migration check) */
  async isInitialized(): Promise<boolean> {
    await this.initialize();
    return this.fs.fileExists(this.indexPath);
  }

  /** Returns the data directory path for the "open folder" feature */
  async getDataDirectory(): Promise<string> {
    await this.initialize();
    return this.dataDir;
  }
}
