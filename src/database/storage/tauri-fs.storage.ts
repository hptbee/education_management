/**
 * TauriFsClassroomStorage
 * Implements ClassroomDatabaseStorage using JSON files stored in the Tauri app data directory.
 *
 * Directory layout:
 *   AppData/ClassroomManagement/
 *     index.json                     ← lightweight list of all classrooms
 *     classrooms/
 *       lop-2-7_2026-2027.json       ← full ClassroomDatabase for each classroom
 *
 * All writes are safe: Rust backend uses a temp-file rename strategy.
 * A write queue prevents concurrent writes from racing each other.
 */

import type { ClassroomDatabase, DatabaseSummary } from "../types";
import type { ClassroomDatabaseStorage } from "./storage.interface";
import { tauriFs } from "../tauri-fs.service";

// ─── INDEX FILE TYPES ────────────────────────────────────────────────────────

interface ClassroomIndexEntry {
  id: string;
  fileName: string;
  className: string;
  schoolYear: string;
  teacherName: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface IndexFile {
  version: 1;
  classrooms: ClassroomIndexEntry[];
}

// ─── STORAGE IMPLEMENTATION ──────────────────────────────────────────────────

export class TauriFsClassroomStorage implements ClassroomDatabaseStorage {
  private dataDir = "";
  private classroomsDir = "";
  private indexPath = "";
  private initialized = false;

  /** Serial write queue — prevents concurrent writes from racing */
  private writeQueue: Promise<void> = Promise.resolve();

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.dataDir = await tauriFs.getDataDirectory();
    this.classroomsDir = tauriFs.joinPath(this.dataDir, "classrooms");
    this.indexPath = tauriFs.joinPath(this.dataDir, "index.json");

    await tauriFs.ensureDir(this.dataDir);
    await tauriFs.ensureDir(this.classroomsDir);

    this.initialized = true;
  }

  // ── Index helpers ───────────────────────────────────────────────────────────

  private async readIndex(): Promise<IndexFile> {
    try {
      const text = await tauriFs.readTextFile(this.indexPath);
      return JSON.parse(text) as IndexFile;
    } catch {
      return { version: 1, classrooms: [] };
    }
  }

  private async writeIndex(index: IndexFile): Promise<void> {
    await tauriFs.writeTextFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  private classroomFilePath(fileName: string): string {
    return tauriFs.joinPath(this.classroomsDir, fileName);
  }

  private makeFileName(db: ClassroomDatabase): string {
    return `${db.metadata.id}.json`;
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
      const text = await tauriFs.readTextFile(this.classroomFilePath(entry.fileName));
      return JSON.parse(text) as ClassroomDatabase;
    } catch {
      return null;
    }
  }

  async save(db: ClassroomDatabase): Promise<void> {
    await this.initialize();

    // Enqueue: each save awaits the previous one to finish
    this.writeQueue = this.writeQueue.then(async () => {
      const fileName = this.makeFileName(db);
      const filePath = this.classroomFilePath(fileName);

      // Write classroom file atomically
      await tauriFs.writeTextFile(filePath, JSON.stringify(db, null, 2));

      // Update index
      const index = await this.readIndex();
      const existingIdx = index.classrooms.findIndex((c) => c.id === db.metadata.id);

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

    return this.writeQueue;
  }

  async delete(id: string): Promise<void> {
    await this.initialize();

    this.writeQueue = this.writeQueue.then(async () => {
      const index = await this.readIndex();
      const entry = index.classrooms.find((c) => c.id === id);

      if (entry) {
        await tauriFs.removeFile(this.classroomFilePath(entry.fileName));
        index.classrooms = index.classrooms.filter((c) => c.id !== id);
        await this.writeIndex(index);
      }
    });

    return this.writeQueue;
  }

  // ── Utility ─────────────────────────────────────────────────────────────────

  /** Returns whether the index.json file already exists (migration check) */
  async isInitialized(): Promise<boolean> {
    await this.initialize();
    return tauriFs.fileExists(this.indexPath);
  }

  /** Returns the data directory path for the "open folder" feature */
  async getDataDirectory(): Promise<string> {
    await this.initialize();
    return this.dataDir;
  }
}
