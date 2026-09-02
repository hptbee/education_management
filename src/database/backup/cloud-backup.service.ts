import type { ClassroomDatabase } from "../types";
import { makeClassroomFileName } from "../database.utils";
import { DATABASE_VERSION } from "../database.factory";
import { backupMetadataService } from "./backup-metadata.service";
import { logAppEvent } from "@/src/logging/app-log";
import { cloudDirtyTracker } from "./cloud-dirty-tracker";
import { uploadCloudSyncBatch } from "./cloud-sync.service";
import { splitClassroomToCloudFiles } from "./cloud-serializer";
import { fetchClassroomsRegistry } from "@/src/auth/api";
import {
  lastAuthUserService,
  resolveCurrentUserId,
  shouldIncludeInAccountBackup,
} from "./classroom-owner";
import { getLastMergedRegistry } from "./cloud-registry.service";
import { isCloudRestoreInProgress } from "./cloud-restore-gate";
import {
  buildBackupStorageKey,
  buildUserClassroomStorageKey,
  getCloudBackupUrl,
  inspectCloudBackupAuth,
  isCloudBackupConfigured,
  isCloudBackupEnabledForDatabase,
  isEntitlementConfigured,
  resolveEntitlementToken,
  sanitizeBackupIdentifier,
} from "./cloud-backup-auth";

export {
  buildBackupStorageKey,
  buildUserClassroomStorageKey,
  getCloudBackupUrl,
  inspectCloudBackupAuth,
  isCloudBackupConfigured,
  isCloudBackupEnabledForDatabase,
  isEntitlementConfigured,
  resolveEntitlementToken,
  sanitizeBackupIdentifier,
};

export interface BackupUploadRequest {
  classroomId: string;
  fileName: string;
  schemaVersion: number;
  timestamp: string;
  payload: ClassroomDatabase;
}

export type CloudBackupState = "disabled" | "idle" | "pending" | "uploading" | "synced" | "failed";

function markAllDomainsForClassroom(db: ClassroomDatabase): void {
  const split = splitClassroomToCloudFiles(db);
  const activityDates = split.paths
    .filter((path) => path.startsWith("activity/") && path.endsWith(".json"))
    .map((path) => path.slice("activity/".length, -".json".length));
  cloudDirtyTracker.markAll(db.metadata.id, activityDates);
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

type BackupListener = (state: CloudBackupState, error: string | null, classroomId?: string) => void;

interface PendingSyncEntry {
  db: ClassroomDatabase;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  failureCount: number;
}

interface ClassroomBackupState {
  state: CloudBackupState;
  error: string | null;
}

export class CloudBackupScheduler {
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private pendingByClassroom = new Map<string, PendingSyncEntry>();
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
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
  private uploadingClassroomId: string | null = null;
  private drainQueuePromise: Promise<void> | null = null;
  private state: CloudBackupState = "disabled";
  private lastError: string | null = null;
  private classroomStates = new Map<string, ClassroomBackupState>();
  private listeners = new Set<BackupListener>();
  private hasPendingLocalSave: ((classroomId: string) => boolean) | null = null;
  private stopped = false;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  setHasPendingLocalSave(fn: ((classroomId: string) => boolean) | null): void {
    this.hasPendingLocalSave = fn;
  }

  subscribe(listener: BackupListener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.lastError);
    return () => this.listeners.delete(listener);
  }

  private emit(classroomId?: string): void {
    for (const listener of this.listeners) {
      listener(this.state, this.lastError, classroomId);
    }
  }

  private setState(
    state: CloudBackupState,
    error: string | null = this.lastError,
    classroomId?: string,
  ): void {
    this.state = state;
    this.lastError = error;
    if (classroomId) {
      this.classroomStates.set(classroomId, { state, error });
    }
    this.emit(classroomId);
  }

  private updateAggregateState(): void {
    if (this.uploadingClassroomId) {
      this.setState("uploading", null, this.uploadingClassroomId);
      return;
    }
    if (this.pendingByClassroom.size > 0) {
      const readyId = this.pickNextPendingClassroomId();
      if (readyId) {
        this.setState("pending", null, readyId);
      }
      return;
    }
    if (this.state === "pending" || this.state === "uploading") {
      this.setState("idle", null);
    }
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

  private mergeLocalClassroomSnapshot(db: ClassroomDatabase): ClassroomDatabase[] {
    const others = this.allLocalClassrooms.filter((item) => item.metadata.id !== db.metadata.id);
    return [...others, db];
  }

  private async canUpload(db: ClassroomDatabase): Promise<boolean> {
    if (!isCloudBackupEnabledForDatabase(db)) return false;
    const userId = await resolveCurrentUserId();
    if (!userId) return false;
    const lastAuthUserId = await lastAuthUserService.readLastAuthUserId();
    const registryKeys = new Set(
      (getLastMergedRegistry()?.classrooms ?? []).map((entry) => entry.key),
    );
    if (
      !shouldIncludeInAccountBackup(
        db.metadata.ownerUserId,
        db.metadata.id,
        userId,
        registryKeys,
        lastAuthUserId,
      )
    ) {
      return false;
    }
    return await isCloudBackupConfigured();
  }

  private clearPending(classroomId: string): void {
    const entry = this.pendingByClassroom.get(classroomId);
    if (entry?.debounceTimer) {
      clearTimeout(entry.debounceTimer);
    }
    this.pendingByClassroom.delete(classroomId);
    const retryTimer = this.retryTimers.get(classroomId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimers.delete(classroomId);
    }
  }

  private ensurePendingEntry(classroomId: string, db?: ClassroomDatabase): PendingSyncEntry | null {
    const existing = this.pendingByClassroom.get(classroomId);
    if (existing) {
      if (db) existing.db = db;
      return existing;
    }

    const snapshot = db ?? this.allLocalClassrooms.find((item) => item.metadata.id === classroomId);
    if (!snapshot) {
      logAppEvent("warn", "cloud-backup", "flush skipped: no classroom snapshot", { classroomId });
      return null;
    }

    const entry: PendingSyncEntry = { db: snapshot, debounceTimer: null, failureCount: 0 };
    this.pendingByClassroom.set(classroomId, entry);
    return entry;
  }

  private pickNextPendingClassroomId(): string | null {
    for (const [id] of this.pendingByClassroom) {
      if (this.retryTimers.has(id)) continue;
      return id;
    }
    return null;
  }

  startPeriodicRetry(): void {
    if (this.periodicTimer) return;
    this.periodicTimer = setInterval(() => {
      if (this.pendingByClassroom.size > 0) {
        void this.flushPending();
      }
    }, PERIODIC_RETRY_MS);
  }

  stop(): void {
    this.stopped = true;
    for (const entry of this.pendingByClassroom.values()) {
      if (entry.debounceTimer) clearTimeout(entry.debounceTimer);
    }
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    if (this.periodicTimer) clearInterval(this.periodicTimer);
    this.pendingByClassroom.clear();
    this.retryTimers.clear();
    this.classroomStates.clear();
    this.periodicTimer = null;
  }

  scheduleAfterLocalSave(db: ClassroomDatabase): void {
    if (isCloudRestoreInProgress(db.metadata.id)) {
      return;
    }

    if (!isCloudBackupEnabledForDatabase(db)) {
      this.updateAggregateState();
      return;
    }

    if (!getCloudBackupUrl()) {
      this.setState("disabled", null, db.metadata.id);
      return;
    }

    void this.scheduleAfterLocalSaveIfAllowed(db);
  }

  private async scheduleAfterLocalSaveIfAllowed(db: ClassroomDatabase): Promise<void> {
    const classroomId = db.metadata.id;

    if (!(await this.canUpload(db))) {
      if (this.stopped) return;
      this.clearPending(classroomId);
      this.setState("disabled", null, classroomId);
      return;
    }

    if (this.stopped || isCloudRestoreInProgress(classroomId)) {
      return;
    }

    let entry = this.pendingByClassroom.get(classroomId);
    if (!entry) {
      entry = { db, debounceTimer: null, failureCount: 0 };
      this.pendingByClassroom.set(classroomId, entry);
    } else {
      entry.db = db;
    }

    void backupMetadataService.recordCloudBackupPending(classroomId);
    this.setState("pending", null, classroomId);

    if (entry.debounceTimer) clearTimeout(entry.debounceTimer);
    entry.debounceTimer = setTimeout(() => {
      entry!.debounceTimer = null;
      void this.flushPending();
    }, CLOUD_DEBOUNCE_MS);
  }

  async checkStartupBackup(db: ClassroomDatabase): Promise<void> {
    if (isCloudRestoreInProgress(db.metadata.id)) {
      return;
    }

    if (!(await this.canUpload(db))) {
      this.setState("disabled", null, db.metadata.id);
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
        markAllDomainsForClassroom(db);
      }
      this.scheduleAfterLocalSave(db);
    } else if (meta.lastCloudBackupStatus === "success") {
      this.setState("synced", null, db.metadata.id);
    }
  }

  async flushPending(): Promise<void> {
    if (this.drainQueuePromise) {
      await this.drainQueuePromise;
      if (this.pickNextPendingClassroomId() && !this.drainQueuePromise) {
        await this.flushPending();
      }
      return;
    }

    this.drainQueuePromise = this.drainQueue();
    try {
      await this.drainQueuePromise;
    } finally {
      this.drainQueuePromise = null;
    }

    if (this.pickNextPendingClassroomId()) {
      await this.flushPending();
    }
  }

  private async drainQueue(): Promise<void> {
    for (;;) {
      const nextId = this.pickNextPendingClassroomId();
      if (!nextId) {
        this.updateAggregateState();
        return;
      }

      await this.flushClassroom(nextId);
    }
  }

  private async flushClassroom(classroomId: string, dbSnapshot?: ClassroomDatabase): Promise<void> {
    let entry: PendingSyncEntry | undefined = this.pendingByClassroom.get(classroomId);
    if (!entry) {
      if (!cloudDirtyTracker.hasDirty(classroomId) && !dbSnapshot) {
        return;
      }
      entry = this.ensurePendingEntry(classroomId, dbSnapshot) ?? undefined;
      if (!entry) return;
    } else if (dbSnapshot) {
      entry.db = dbSnapshot;
    }

    const db = entry.db;
    if (!(await this.canUpload(db))) {
      if (this.stopped) return;
      this.clearPending(classroomId);
      this.setState("disabled", null, classroomId);
      return;
    }

    if (this.stopped || isCloudRestoreInProgress(classroomId)) {
      return;
    }

    if (entry.debounceTimer) {
      clearTimeout(entry.debounceTimer);
      entry.debounceTimer = null;
    }

    const uploadedId = db.metadata.id;
    const uploadedAt = db.metadata.updatedAt;
    this.uploadingClassroomId = uploadedId;
    this.setState("uploading", null, uploadedId);

    try {
      try {
        const { refreshCloudRegistrySummaries } = await import("./cloud-registry.service");
        await refreshCloudRegistrySummaries();
      } catch (refreshError) {
        logAppEvent("warn", "cloud-backup", "refreshCloudRegistrySummaries failed", refreshError);
      }
      const dirty = cloudDirtyTracker.get(uploadedId);
      const syncState = await backupMetadataService.getCloudSyncState(uploadedId);

      let remoteRegistry: import("./cloud-types").CloudClassroomsRegistryFile | null = null;
      const { isRegistryPullCompleted } = await import("./cloud-registry.service");
      let allowRegistryUpload = isRegistryPullCompleted();
      if (allowRegistryUpload) {
        const token = await resolveEntitlementToken();
        if (token) {
          try {
            const fetched = await fetchClassroomsRegistry(token, this.fetchImpl);
            remoteRegistry = fetched.registry;
          } catch {
            allowRegistryUpload = false;
          }
        }
      } else {
        allowRegistryUpload = false;
      }

      const result = await uploadCloudSyncBatch(db, dirty, {
        allLocalClassrooms:
          this.allLocalClassrooms.length > 0
            ? this.mergeLocalClassroomSnapshot(db)
            : this.allLocalClassrooms,
        registrySummaries: this.registrySummaries,
        fetchImpl: this.fetchImpl,
        forceFull: !syncState.migratedToStructured,
        remoteRegistry,
        allowRegistryUpload,
      });

      const currentEntry = this.pendingByClassroom.get(uploadedId);
      const hasNewerPending =
        currentEntry !== undefined &&
        currentEntry.db.metadata.updatedAt !== uploadedAt;
      const hasUnflushedLocal = this.hasPendingLocalSave?.(uploadedId) ?? false;
      const stillDirty = cloudDirtyTracker.hasDirty(uploadedId);

      if (hasNewerPending || hasUnflushedLocal || stillDirty) {
        entry.failureCount = 0;
        this.setState("pending", null, uploadedId);
        // Partial sync: keep dirty flags but drop from the active drain queue to avoid spinning.
        if (!(hasNewerPending || hasUnflushedLocal)) {
          this.pendingByClassroom.delete(uploadedId);
        }
      } else {
        this.pendingByClassroom.delete(uploadedId);
        const retryTimer = this.retryTimers.get(uploadedId);
        if (retryTimer) {
          clearTimeout(retryTimer);
          this.retryTimers.delete(uploadedId);
        }
        cloudDirtyTracker.clear(uploadedId);
        this.setState("synced", null, uploadedId);
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
      entry.failureCount += 1;
      this.setState("failed", message, uploadedId);
      this.scheduleRetryForClassroom(uploadedId);
    } finally {
      this.uploadingClassroomId = null;
    }
  }

  /** Flush pending cloud sync for one classroom — preserves other pending classrooms. */
  async flushCloudSyncForClassroom(classroomKey: string, db?: ClassroomDatabase): Promise<void> {
    const entry = this.ensurePendingEntry(classroomKey, db);
    if (!entry && !cloudDirtyTracker.hasDirty(classroomKey)) {
      return;
    }

    if (entry?.debounceTimer) {
      clearTimeout(entry.debounceTimer);
      entry.debounceTimer = null;
    }

    const retryTimer = this.retryTimers.get(classroomKey);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimers.delete(classroomKey);
    }

    if (this.pendingByClassroom.has(classroomKey) || cloudDirtyTracker.hasDirty(classroomKey)) {
      await this.flushPending();
    }
  }

  private scheduleRetryForClassroom(classroomId: string): void {
    const entry = this.pendingByClassroom.get(classroomId);
    if (!entry) return;

    const existing = this.retryTimers.get(classroomId);
    if (existing) clearTimeout(existing);

    const delay = BACKOFF_MS[Math.min(entry.failureCount - 1, BACKOFF_MS.length - 1)];
    const timer = setTimeout(() => {
      this.retryTimers.delete(classroomId);
      void this.flushPending();
    }, delay);
    this.retryTimers.set(classroomId, timer);
  }

  getState(): CloudBackupState {
    return this.state;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getStateForClassroom(classroomId: string): ClassroomBackupState {
    const perClass = this.classroomStates.get(classroomId);
    if (perClass) return perClass;
    if (this.state === "disabled") {
      return { state: "disabled", error: null };
    }
    return { state: "idle", error: null };
  }

  hasPendingClassroom(classroomId: string): boolean {
    return this.pendingByClassroom.has(classroomId);
  }

  /** Skip debounce and upload immediately (manual retry / first backup). */
  async triggerUploadNow(db: ClassroomDatabase): Promise<void> {
    if (!(await this.canUpload(db))) {
      this.clearPending(db.metadata.id);
      this.setState("disabled", null, db.metadata.id);
      return;
    }

    markAllDomainsForClassroom(db);
    let entry = this.pendingByClassroom.get(db.metadata.id);
    if (!entry) {
      entry = { db, debounceTimer: null, failureCount: 0 };
      this.pendingByClassroom.set(db.metadata.id, entry);
    } else {
      entry.db = db;
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
        entry.debounceTimer = null;
      }
    }
    void backupMetadataService.recordCloudBackupPending(db.metadata.id);
    this.setState("pending", null, db.metadata.id);
    await this.flushPending();
  }
}

export const cloudBackupScheduler = new CloudBackupScheduler();

export async function flushCloudSync(): Promise<void> {
  await cloudBackupScheduler.flushPending();
}
