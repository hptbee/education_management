import type { ClassroomDatabase } from "../types";
import { makeClassroomFileName } from "../database.utils";
import { DATABASE_VERSION } from "../database.factory";
import { deviceIdService } from "./device-id.service";
import { backupMetadataService } from "./backup-metadata.service";

export interface BackupUploadRequest {
  deviceId: string;
  classroomId: string;
  fileName: string;
  schemaVersion: number;
  timestamp: string;
  payload: ClassroomDatabase;
}

export type CloudBackupState = "disabled" | "idle" | "pending" | "uploading" | "synced" | "failed";

export function getCloudBackupUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL?.trim();
  return url || null;
}

export function isCloudBackupEnabled(): boolean {
  return Boolean(getCloudBackupUrl());
}

export function sanitizeBackupIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function buildBackupStorageKey(deviceId: string, classroomId: string): string {
  const safeDevice = sanitizeBackupIdentifier(deviceId);
  const safeClassroom = sanitizeBackupIdentifier(classroomId);
  if (!safeDevice || !safeClassroom) {
    throw new Error("Invalid backup identifiers");
  }
  return `backups/${safeDevice}/${safeClassroom}/latest.json`;
}

export async function uploadClassroomBackup(
  db: ClassroomDatabase,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const baseUrl = getCloudBackupUrl();
  if (!baseUrl) return;

  const deviceId = await deviceIdService.getDeviceId();
  const body: BackupUploadRequest = {
    deviceId,
    classroomId: db.metadata.id,
    fileName: makeClassroomFileName(db.metadata.id),
    schemaVersion: DATABASE_VERSION,
    timestamp: db.metadata.updatedAt,
    payload: db,
  };

  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/backup`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Cloud backup failed (${response.status})`);
  }

  await backupMetadataService.recordCloudBackupSuccess(db.metadata.id, db.metadata.updatedAt);
}

const BACKOFF_MS = [30_000, 60_000, 120_000, 300_000, 900_000];
const CLOUD_DEBOUNCE_MS = 30_000;
const PERIODIC_RETRY_MS = 5 * 60_000;

type BackupListener = (state: CloudBackupState, error: string | null) => void;

export class CloudBackupScheduler {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private pendingDb: ClassroomDatabase | null = null;
  private uploading = false;
  private failureCount = 0;
  private state: CloudBackupState = isCloudBackupEnabled() ? "idle" : "disabled";
  private lastError: string | null = null;
  private listeners = new Set<BackupListener>();

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  subscribe(listener: BackupListener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.lastError);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state, this.lastError);
    }
  }

  private setState(state: CloudBackupState, error: string | null = this.lastError): void {
    this.state = state;
    this.lastError = error;
    this.emit();
  }

  startPeriodicRetry(): void {
    if (!isCloudBackupEnabled() || this.periodicTimer) return;
    this.periodicTimer = setInterval(() => {
      if (this.pendingDb) {
        void this.flushPending();
      }
    }, PERIODIC_RETRY_MS);
  }

  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.periodicTimer) clearInterval(this.periodicTimer);
    this.debounceTimer = null;
    this.retryTimer = null;
    this.periodicTimer = null;
  }

  scheduleAfterLocalSave(db: ClassroomDatabase): void {
    if (!isCloudBackupEnabled()) {
      this.setState("disabled", null);
      return;
    }

    this.pendingDb = db;
    void backupMetadataService.recordCloudBackupPending(db.metadata.id);
    this.setState("pending", null);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushPending();
    }, CLOUD_DEBOUNCE_MS);
  }

  async checkStartupBackup(db: ClassroomDatabase): Promise<void> {
    if (!isCloudBackupEnabled()) return;

    const meta = await backupMetadataService.getClassroomMeta(db.metadata.id);
    const needsBackup =
      !meta.lastBackedUpUpdatedAt ||
      new Date(db.metadata.updatedAt).getTime() > new Date(meta.lastBackedUpUpdatedAt).getTime();

    if (needsBackup) {
      this.scheduleAfterLocalSave(db);
    } else if (meta.lastCloudBackupStatus === "success") {
      this.setState("synced", null);
    }
  }

  async flushPending(): Promise<void> {
    if (!isCloudBackupEnabled() || this.uploading || !this.pendingDb) return;

    const db = this.pendingDb;
    this.uploading = true;
    this.setState("uploading", null);

    try {
      await uploadClassroomBackup(db, this.fetchImpl);
      this.pendingDb = null;
      this.failureCount = 0;
      this.setState("synced", null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await backupMetadataService.recordCloudBackupFailure(db.metadata.id, message);
      this.failureCount += 1;
      this.setState("failed", message);
      this.scheduleRetry();
    } finally {
      this.uploading = false;
    }
  }

  private scheduleRetry(): void {
    if (!this.pendingDb) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay = BACKOFF_MS[Math.min(this.failureCount - 1, BACKOFF_MS.length - 1)];
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flushPending();
    }, delay);
  }

  getState(): CloudBackupState {
    return this.state;
  }
}

export const cloudBackupScheduler = new CloudBackupScheduler();
