import type { ClassroomDatabase } from "../types";
import { makeClassroomFileName } from "../database.utils";
import { DATABASE_VERSION } from "../database.factory";
import { backupMetadataService } from "./backup-metadata.service";
import { loadAuthSession } from "@/src/auth/secure-storage";
import { verifyEntitlementToken } from "@/src/auth/entitlement";
import { sanitizeBackupIdentifier } from "../safeIdentifiers";
import { logAppEvent } from "@/src/logging/app-log";
import { cloudDirtyTracker } from "./cloud-dirty-tracker";
import { uploadCloudSyncBatch } from "./cloud-sync.service";
import { isRegistryPullCompleted } from "./cloud-registry.service";
import { fetchClassroomsRegistry } from "@/src/auth/api";

export interface BackupUploadRequest {
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

export function isEntitlementConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY?.trim());
}

export async function resolveEntitlementToken(): Promise<string | null> {
  const session = await loadAuthSession();
  if (!session?.entitlement) return null;

  const verified = await verifyEntitlementToken(session.entitlement);
  if (!verified?.claims.permissions.cloudBackup) return null;

  return session.entitlement;
}

export async function isCloudBackupConfigured(): Promise<boolean> {
  const url = getCloudBackupUrl();
  if (!url || !isEntitlementConfigured()) return false;
  const token = await resolveEntitlementToken();
  return Boolean(token);
}

export function isCloudBackupEnabledForDatabase(db: ClassroomDatabase): boolean {
  return Boolean(db.appSettings?.cloudBackupEnabled);
}

export { sanitizeBackupIdentifier };

export function buildUserClassroomStorageKey(userId: string, classroomId: string): string {
  const safeUser = sanitizeBackupIdentifier(userId);
  const safeClassroom = sanitizeBackupIdentifier(classroomId);
  if (!safeUser || !safeClassroom) {
    throw new Error("Invalid backup identifiers");
  }
  return `users/${safeUser}/classrooms/${safeClassroom}/database.json`;
}

/** @deprecated Legacy device-based layout */
export function buildBackupStorageKey(deviceId: string, classroomId: string): string {
  const safeDevice = sanitizeBackupIdentifier(deviceId);
  const safeClassroom = sanitizeBackupIdentifier(classroomId);
  if (!safeDevice || !safeClassroom) {
    throw new Error("Invalid backup identifiers");
  }
  return `backups/${safeDevice}/${safeClassroom}/latest.json`;
}

/** @deprecated Monolithic upload — use structured sync via CloudBackupScheduler */
export async function uploadClassroomBackup(
  db: ClassroomDatabase,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const baseUrl = getCloudBackupUrl();
  if (!baseUrl) return;

  if (!isCloudBackupEnabledForDatabase(db)) {
    return;
  }

  const token = await resolveEntitlementToken();
  if (!token) {
    return;
  }

  const body: BackupUploadRequest = {
    classroomId: db.metadata.id,
    fileName: makeClassroomFileName(db.metadata.id),
    schemaVersion: DATABASE_VERSION,
    timestamp: db.metadata.updatedAt,
    payload: db,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/backup`, {
    method: "PUT",
    headers,
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
  private pendingClassroomId: string | null = null;
  private allLocalClassrooms: ClassroomDatabase[] = [];
  private registrySummaries: Array<{
    id: string;
    className: string;
    schoolYear: string;
    createdAt: string;
    updatedAt: string;
    archived?: boolean;
    deletedAt?: string;
  }> = [];
  private uploading = false;
  private failureCount = 0;
  private state: CloudBackupState = "disabled";
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

  setLocalClassroomRegistry(classrooms: ClassroomDatabase[]): void {
    this.allLocalClassrooms = classrooms;
  }

  setRegistrySummaries(
    summaries: Array<{
      id: string;
      className: string;
      schoolYear: string;
      createdAt: string;
      updatedAt: string;
      archived?: boolean;
      deletedAt?: string;
    }>,
  ): void {
    this.registrySummaries = summaries;
  }

  private async canUpload(db: ClassroomDatabase): Promise<boolean> {
    if (!isCloudBackupEnabledForDatabase(db)) return false;
    return await isCloudBackupConfigured();
  }

  startPeriodicRetry(): void {
    if (this.periodicTimer) return;
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
    if (!isCloudBackupEnabledForDatabase(db)) {
      this.setState("disabled", null);
      return;
    }

    if (!getCloudBackupUrl()) {
      this.setState("disabled", null);
      return;
    }

    void this.scheduleAfterLocalSaveIfAllowed(db);
  }

  private async scheduleAfterLocalSaveIfAllowed(db: ClassroomDatabase): Promise<void> {
    if (!(await this.canUpload(db))) {
      this.pendingDb = null;
      this.pendingClassroomId = null;
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.setState("disabled", null);
      return;
    }

    this.pendingDb = db;
    this.pendingClassroomId = db.metadata.id;
    void backupMetadataService.recordCloudBackupPending(db.metadata.id);
    this.setState("pending", null);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushPending();
    }, CLOUD_DEBOUNCE_MS);
  }

  async checkStartupBackup(db: ClassroomDatabase): Promise<void> {
    if (!await this.canUpload(db)) {
      this.setState("disabled", null);
      return;
    }

    const meta = await backupMetadataService.getClassroomMeta(db.metadata.id);
    const syncState = await backupMetadataService.getCloudSyncState(db.metadata.id);
    const needsBackup =
      !meta.lastBackedUpUpdatedAt ||
      new Date(db.metadata.updatedAt).getTime() > new Date(meta.lastBackedUpUpdatedAt).getTime() ||
      !syncState.migratedToStructured;

    if (needsBackup) {
      if (!syncState.migratedToStructured) {
        cloudDirtyTracker.markAll(db.metadata.id);
      }
      this.scheduleAfterLocalSave(db);
    } else if (meta.lastCloudBackupStatus === "success") {
      this.setState("synced", null);
    }
  }

  async flushPending(): Promise<void> {
    if (this.uploading || !this.pendingDb) return;

    const db = this.pendingDb;
    if (db.metadata.id !== this.pendingClassroomId) {
      return;
    }

    if (!(await this.canUpload(db))) {
      this.setState("disabled", null);
      return;
    }

    const uploadedId = db.metadata.id;
    const uploadedAt = db.metadata.updatedAt;
    this.uploading = true;
    this.setState("uploading", null);

    let needsFollowUpFlush = false;

    try {
      const dirty = cloudDirtyTracker.get(uploadedId);
      const syncState = await backupMetadataService.getCloudSyncState(uploadedId);

      let remoteRegistry: import("./cloud-types").CloudClassroomsRegistryFile | null = null;
      let allowRegistryUpload = isRegistryPullCompleted();
      if (!allowRegistryUpload) {
        allowRegistryUpload = false;
      } else {
        const token = await resolveEntitlementToken();
        if (token) {
          try {
            const fetched = await fetchClassroomsRegistry(token, this.fetchImpl);
            remoteRegistry = fetched.registry;
          } catch {
            allowRegistryUpload = false;
          }
        }
      }

      const result = await uploadCloudSyncBatch(db, dirty, {
        allLocalClassrooms: this.allLocalClassrooms,
        registrySummaries: this.registrySummaries,
        fetchImpl: this.fetchImpl,
        forceFull: !syncState.migratedToStructured,
        remoteRegistry,
        allowRegistryUpload,
      });

      const hasNewerPending =
        this.pendingDb !== null &&
        (this.pendingDb.metadata.id !== uploadedId ||
          this.pendingDb.metadata.updatedAt !== uploadedAt);

      if (hasNewerPending) {
        this.failureCount = 0;
        this.setState("pending", null);
        needsFollowUpFlush = true;
      } else {
        this.pendingDb = null;
        this.pendingClassroomId = null;
        cloudDirtyTracker.clear(uploadedId);
        this.failureCount = 0;
        this.setState("synced", null);
        await backupMetadataService.recordCloudBackupSuccess(uploadedId, uploadedAt);
        logAppEvent("info", "cloud-backup", "Cloud sync uploaded", {
          classroomId: uploadedId,
          updatedAt: uploadedAt,
          uploadedPaths: result.uploadedPaths.length,
          skippedPaths: result.skippedPaths.length,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logAppEvent("error", "cloud-backup", message, {
        classroomId: db.metadata.id,
        updatedAt: db.metadata.updatedAt,
      });
      await backupMetadataService.recordCloudBackupFailure(db.metadata.id, message);
      this.failureCount += 1;
      this.setState("failed", message);
      this.scheduleRetry();
    } finally {
      this.uploading = false;
      if (needsFollowUpFlush) {
        queueMicrotask(() => void this.flushPending());
      }
    }
  }

  /** Await pending cloud sync for classroom switch — flushes dirty state for a specific class. */
  async flushCloudSyncForClassroom(classroomKey: string): Promise<void> {
    if (this.pendingDb?.metadata.id === classroomKey) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      await this.flushPending();
      return;
    }

    if (cloudDirtyTracker.hasDirty(classroomKey) && this.pendingDb?.metadata.id === classroomKey) {
      await this.flushPending();
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

  getLastError(): string | null {
    return this.lastError;
  }

  /** Skip debounce and upload immediately (manual retry). */
  async triggerUploadNow(db: ClassroomDatabase): Promise<void> {
    if (!(await this.canUpload(db))) {
      this.pendingDb = null;
      this.pendingClassroomId = null;
      this.setState("disabled", null);
      return;
    }

    cloudDirtyTracker.markAll(db.metadata.id);
    this.pendingDb = db;
    this.pendingClassroomId = db.metadata.id;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    void backupMetadataService.recordCloudBackupPending(db.metadata.id);
    this.setState("pending", null);
    await this.flushPending();
  }
}

export const cloudBackupScheduler = new CloudBackupScheduler();

export async function flushCloudSync(): Promise<void> {
  await cloudBackupScheduler.flushPending();
}
