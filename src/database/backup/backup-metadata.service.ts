import type { FileStorageAdapter } from "../storage/storage.interface";
import { tauriFs, isTauri } from "../tauri-fs.service";

export type CloudBackupStatus = "success" | "pending" | "failed" | "disabled";

export interface ClassroomBackupMeta {
  lastLocalSaveAt: string | null;
  lastCloudBackupAt: string | null;
  lastCloudBackupStatus: CloudBackupStatus;
  lastCloudBackupError: string | null;
  lastBackedUpUpdatedAt: string | null;
}

export interface BackupStatusFile {
  version: 1;
  classrooms: Record<string, ClassroomBackupMeta>;
}

const BACKUP_STATUS_KEY = "education-management:backup-status";
const BACKUP_STATUS_FILE = "backup-status.json";

function emptyClassroomMeta(): ClassroomBackupMeta {
  return {
    lastLocalSaveAt: null,
    lastCloudBackupAt: null,
    lastCloudBackupStatus: "disabled",
    lastCloudBackupError: null,
    lastBackedUpUpdatedAt: null,
  };
}

function emptyStatusFile(): BackupStatusFile {
  return { version: 1, classrooms: {} };
}

function readStatusFromLocalStorage(): BackupStatusFile {
  if (typeof window === "undefined") return emptyStatusFile();
  try {
    const raw = localStorage.getItem(BACKUP_STATUS_KEY);
    if (!raw) return emptyStatusFile();
    const parsed = JSON.parse(raw) as BackupStatusFile;
    return {
      version: 1,
      classrooms: parsed.classrooms ?? {},
    };
  } catch {
    return emptyStatusFile();
  }
}

function writeStatusToLocalStorage(file: BackupStatusFile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BACKUP_STATUS_KEY, JSON.stringify(file));
  } catch {
    // ignore quota errors
  }
}

export class BackupMetadataService {
  private cache: BackupStatusFile | null = null;

  constructor(private readonly fs: FileStorageAdapter | null = isTauri() ? tauriFs : null) {}

  private async readFile(): Promise<BackupStatusFile> {
    if (this.cache) return this.cache;

    if (this.fs) {
      try {
        const dataDir = await this.fs.getDataDirectory();
        const path = this.fs.joinPath(dataDir, BACKUP_STATUS_FILE);
        if (await this.fs.fileExists(path)) {
          const text = await this.fs.readTextFile(path);
          const parsed = JSON.parse(text) as BackupStatusFile;
          this.cache = {
            version: 1,
            classrooms: parsed.classrooms ?? {},
          };
          writeStatusToLocalStorage(this.cache);
          return this.cache;
        }
      } catch {
        // fall through
      }
    }

    this.cache = readStatusFromLocalStorage();
    return this.cache;
  }

  private async writeFile(file: BackupStatusFile): Promise<void> {
    this.cache = file;
    writeStatusToLocalStorage(file);

    if (!this.fs) return;
    const dataDir = await this.fs.getDataDirectory();
    const path = this.fs.joinPath(dataDir, BACKUP_STATUS_FILE);
    await this.fs.writeTextFile(path, JSON.stringify(file, null, 2));
  }

  async getClassroomMeta(classroomId: string): Promise<ClassroomBackupMeta> {
    const file = await this.readFile();
    return file.classrooms[classroomId] ?? emptyClassroomMeta();
  }

  async updateClassroomMeta(
    classroomId: string,
    patch: Partial<ClassroomBackupMeta>,
  ): Promise<ClassroomBackupMeta> {
    const file = await this.readFile();
    const current = file.classrooms[classroomId] ?? emptyClassroomMeta();
    const next = { ...current, ...patch };
    file.classrooms[classroomId] = next;
    await this.writeFile(file);
    return next;
  }

  async recordLocalSave(classroomId: string, updatedAt: string): Promise<void> {
    await this.updateClassroomMeta(classroomId, {
      lastLocalSaveAt: updatedAt,
    });
  }

  async recordCloudBackupSuccess(classroomId: string, updatedAt: string): Promise<void> {
    const now = new Date().toISOString();
    await this.updateClassroomMeta(classroomId, {
      lastCloudBackupAt: now,
      lastCloudBackupStatus: "success",
      lastCloudBackupError: null,
      lastBackedUpUpdatedAt: updatedAt,
    });
  }

  async recordCloudBackupPending(classroomId: string): Promise<void> {
    const current = await this.getClassroomMeta(classroomId);
    if (current.lastCloudBackupStatus === "success") {
      await this.updateClassroomMeta(classroomId, {
        lastCloudBackupStatus: "pending",
        lastCloudBackupError: null,
      });
      return;
    }
    await this.updateClassroomMeta(classroomId, {
      lastCloudBackupStatus: "pending",
    });
  }

  async recordCloudBackupFailure(classroomId: string, error: string): Promise<void> {
    await this.updateClassroomMeta(classroomId, {
      lastCloudBackupStatus: "failed",
      lastCloudBackupError: error,
    });
  }
}

export const backupMetadataService = new BackupMetadataService();
