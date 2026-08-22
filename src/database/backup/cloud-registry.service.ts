import {
  listCloudClassrooms,
  restoreCloudClassroom,
  restoreCloudClassroomAssets,
  fetchClassroomsRegistry,
} from "@/src/auth/api";
import { databaseService } from "../database.service";
import {
  buildClassroomsRegistryFromSummaries,
  mergeClassroomRegistries,
  visibleRegistryEntries,
} from "./cloud-serializer";
import type { CloudClassroomsRegistryFile } from "./cloud-types";
import {
  cloudBackupScheduler,
  getCloudBackupUrl,
  isCloudBackupConfigured,
  resolveEntitlementToken,
  inspectCloudBackupAuth,
} from "./cloud-backup.service";
import { uploadRegistryMerge } from "./cloud-sync.service";
import { beginCloudRestore, endCloudRestore } from "./cloud-restore-gate";
import { recordCloudRestoreSyncBaseline } from "./cloud-restore-sync";
import { cloudDirtyTracker } from "./cloud-dirty-tracker";
import type { ClassroomDatabase } from "../types";
import { logAppEvent, logCloudTrace } from "@/src/logging/app-log";

export type PullRegistryResult =
  | { ok: true; registry: CloudClassroomsRegistryFile; source: "registry" | "legacy" }
  | { ok: false; reason: "not_configured" | "unauthorized" | "network" };

let registryPullCompleted = false;
let registryPullPromise: Promise<PullRegistryResult> | null = null;
let lastMergedRegistry: CloudClassroomsRegistryFile | null = null;

export class HydrateCancelledError extends Error {
  constructor() {
    super("hydrate-cancelled");
    this.name = "HydrateCancelledError";
  }
}

export function isHydrateCancelledError(error: unknown): boolean {
  return error instanceof HydrateCancelledError;
}

interface InFlightHydrate {
  promise: Promise<ClassroomDatabase>;
  waiters: Set<() => boolean>;
}

const hydrateInFlight = new Map<string, InFlightHydrate>();

function allWaitersCancelled(waiters: Set<() => boolean>): boolean {
  if (waiters.size === 0) return false;
  for (const isCancelled of waiters) {
    if (!isCancelled()) return false;
  }
  return true;
}

export function isRegistryPullCompleted(): boolean {
  return registryPullCompleted;
}

export function getLastMergedRegistry(): CloudClassroomsRegistryFile | null {
  return lastMergedRegistry;
}

export async function refreshCloudRegistrySummaries(): Promise<void> {
  const summaries = await databaseService.listDatabases();
  cloudBackupScheduler.setRegistrySummaries(
    summaries.map((s) => ({
      id: s.id,
      className: s.className,
      schoolYear: s.schoolYear,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      archived: s.archived,
    })),
  );

  const hydrated = summaries.filter((item) => item.hydrated !== false);
  const classrooms: ClassroomDatabase[] = [];
  for (const summary of hydrated) {
    const snapshot = await databaseService.loadClassroomSnapshot(summary.id);
    if (snapshot) classrooms.push(snapshot);
  }
  cloudBackupScheduler.setLocalClassroomRegistry(classrooms);
}

export async function pullClassroomRegistry(fetchImpl?: typeof fetch): Promise<PullRegistryResult> {
  if (!getCloudBackupUrl()) {
    logCloudTrace("warn", "cloud-registry", "pull skipped: no backup URL");
    return { ok: false, reason: "not_configured" };
  }

  const token = await resolveEntitlementToken();
  if (!token) {
    logCloudTrace("warn", "cloud-registry", "pull skipped: unauthorized", await inspectCloudBackupAuth());
    return { ok: false, reason: "unauthorized" };
  }

  try {
    const fetched = await fetchClassroomsRegistry(token, fetchImpl);
    if (fetched.source === "registry" && fetched.registry) {
      logCloudTrace("info", "cloud-registry", "pulled classrooms.json", {
        count: fetched.registry.classrooms.length,
        source: fetched.source,
      });
      return { ok: true, registry: fetched.registry, source: "registry" };
    }

    const legacyList = await listCloudClassrooms(token, fetchImpl);
    const now = new Date().toISOString();
    const registry: CloudClassroomsRegistryFile = {
      version: 1,
      updatedAt: now,
      classrooms: legacyList.map((item) => ({
        key: item.classroomId,
        name: item.name ?? item.classroomId,
        schoolYear: item.schoolYear ?? "",
        createdAt: item.updatedAt ?? now,
        updatedAt: item.updatedAt ?? now,
        archived: item.archived ?? false,
      })),
    };
    return { ok: true, registry, source: "legacy" };
  } catch (error) {
    logAppEvent("warn", "cloud-registry", "pullClassroomRegistry failed", error);
    return { ok: false, reason: "network" };
  }
}

export async function mergeAndRememberRegistry(registry: CloudClassroomsRegistryFile): Promise<void> {
  const entries = visibleRegistryEntries(registry);
  await databaseService.mergeRegistryStubs(entries);
  lastMergedRegistry = registry;
  await refreshCloudRegistrySummaries();
}

export async function ensureRegistryPulled(
  fetchImpl?: typeof fetch,
  options?: { force?: boolean },
): Promise<PullRegistryResult> {
  if (!options?.force && registryPullCompleted && lastMergedRegistry) {
    return { ok: true, registry: lastMergedRegistry, source: "registry" };
  }

  if (!options?.force && registryPullCompleted) {
    const summaries = await databaseService.listDatabases();
    const now = new Date().toISOString();
    const registry = buildClassroomsRegistryFromSummaries(
      summaries.map((s) => ({
        id: s.id,
        className: s.className,
        schoolYear: s.schoolYear,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        archived: s.archived,
      })),
      now,
    );
    lastMergedRegistry = registry;
    return { ok: true, registry, source: "registry" };
  }

  if (options?.force) {
    if (registryPullPromise) {
      await registryPullPromise;
    }
    const result = await pullClassroomRegistry(fetchImpl);
    if (result.ok) {
      await mergeAndRememberRegistry(result.registry);
      registryPullCompleted = true;
    }
    return result;
  }

  if (!registryPullPromise) {
    registryPullPromise = pullClassroomRegistry(fetchImpl)
      .then(async (result) => {
        if (result.ok) {
          await mergeAndRememberRegistry(result.registry);
          registryPullCompleted = true;
        } else {
          registryPullPromise = null;
        }
        return result;
      })
      .catch((error) => {
        registryPullPromise = null;
        logAppEvent("warn", "cloud-registry", "ensureRegistryPulled failed", error);
        return { ok: false as const, reason: "network" as const };
      });
  }

  return registryPullPromise;
}

export async function pullAndMergeAccountRegistry(
  fetchImpl?: typeof fetch,
  options?: { force?: boolean },
): Promise<PullRegistryResult> {
  if (!(await isCloudBackupConfigured())) {
    logCloudTrace("warn", "cloud-registry", "merge skipped: not configured", await inspectCloudBackupAuth());
    return { ok: false, reason: "not_configured" };
  }

  const result = await ensureRegistryPulled(fetchImpl, { force: options?.force !== false });
  logCloudTrace("info", "cloud-registry", "pullAndMergeAccountRegistry", {
    ok: result.ok,
    reason: result.ok ? result.source : result.reason,
    classrooms: result.ok ? result.registry.classrooms.length : 0,
    force: options?.force !== false,
  });
  if (result.ok) {
    await databaseService.enableCloudBackupOnAllHydratedClassrooms();
  }
  return result;
}

export type RegistrySummaryInput = {
  id: string;
  className: string;
  schoolYear: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  deletedAt?: string;
};

export async function pushClassroomRegistryMerge(
  summaries: RegistrySummaryInput[],
  options?: { fetchImpl?: typeof fetch; markDeletedKey?: string },
): Promise<void> {
  if (!(await isCloudBackupConfigured())) return;
  if (!registryPullCompleted) {
    const pulled = await ensureRegistryPulled(options?.fetchImpl);
    if (!pulled.ok && pulled.reason === "network") {
      return;
    }
  }

  const now = new Date().toISOString();
  let entries = summaries.map((s) => ({
    id: s.id,
    className: s.className,
    schoolYear: s.schoolYear,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    archived: s.archived,
    deletedAt: s.deletedAt,
  }));

  if (options?.markDeletedKey) {
    entries = entries.filter((e) => e.id !== options.markDeletedKey);
    entries.push({
      id: options.markDeletedKey,
      className: "",
      schoolYear: "",
      createdAt: now,
      updatedAt: now,
      archived: true,
      deletedAt: now,
    });
  }

  const localRegistry = buildClassroomsRegistryFromSummaries(entries, now);

  const token = await resolveEntitlementToken();
  if (!token) return;

  let remoteRegistry: CloudClassroomsRegistryFile | null = null;
  try {
    const fetched = await fetchClassroomsRegistry(token, options?.fetchImpl);
    if (fetched.registry) {
      remoteRegistry = fetched.registry;
    }
  } catch {
    // proceed with local only if remote fetch fails after pull completed
    if (!registryPullCompleted) return;
  }

  const merged = mergeClassroomRegistries(localRegistry, remoteRegistry);
  await uploadRegistryMerge(merged, options?.fetchImpl);
  lastMergedRegistry = merged;
}

async function hydrateClassroomFromCloudInner(
  classroomKey: string,
  waiters: Set<() => boolean>,
): Promise<ClassroomDatabase> {
  const heldGateIds = new Set<string>([classroomKey]);
  beginCloudRestore(classroomKey);
  try {
    const token = await resolveEntitlementToken();
    if (!token) {
      logCloudTrace("error", "cloud-restore", "hydrate aborted: no token", {
        classroomKey,
        ...(await inspectCloudBackupAuth()),
      });
      throw new Error("Cloud backup not authorized");
    }

    logCloudTrace("info", "cloud-restore", "hydrate start", { classroomKey, isTauri: (await inspectCloudBackupAuth()).isTauri });

    const payload = await restoreCloudClassroom(token, classroomKey);
    if (!payload) {
      logCloudTrace("error", "cloud-restore", "GET /restore returned empty", { classroomKey });
      throw new Error("Không tìm thấy bản sao lưu trên đám mây.");
    }

    if (allWaitersCancelled(waiters)) {
      logCloudTrace("warn", "cloud-restore", "hydrate cancelled after JSON", { classroomKey });
      throw new HydrateCancelledError();
    }

    const assets = await restoreCloudClassroomAssets(token, classroomKey);
    logCloudTrace("info", "cloud-restore", "GET /restore assets", {
      classroomKey,
      count: assets.length,
      paths: assets.map((item) => item.path),
    });

    if (allWaitersCancelled(waiters)) {
      logCloudTrace("warn", "cloud-restore", "hydrate cancelled after assets", { classroomKey });
      throw new HydrateCancelledError();
    }

    let db: ClassroomDatabase;
    try {
      db = await databaseService.saveCloudRestoredDatabase(payload, { cloudAssets: assets });
    } catch (error) {
      const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
      const metadata = record?.metadata as Record<string, unknown> | undefined;
      const nested = record?.payload as Record<string, unknown> | undefined;
      logCloudTrace("error", "cloud-restore", "hydrate save failed", {
        classroomKey,
        message: error instanceof Error ? error.message : String(error),
        payloadType: typeof payload,
        payloadKeys: record ? Object.keys(record).slice(0, 20) : [],
        hasPayloadWrapper: Boolean(nested && typeof nested === "object"),
        metadataId: typeof metadata?.id === "string" ? metadata.id : null,
        metadataVersion: typeof metadata?.version === "number" ? metadata.version : null,
      });
      throw error;
    }

    heldGateIds.add(db.metadata.id);
    beginCloudRestore(db.metadata.id);
    await recordCloudRestoreSyncBaseline(db);
    cloudDirtyTracker.clear(db.metadata.id);

    logCloudTrace("info", "cloud-restore", "hydrate saved locally", {
      classroomKey,
      classroomId: db.metadata.id,
      bannerAssetKey: db.classroomSettings.bannerAssetKey ?? null,
      teacherAvatarKey: db.classroomSettings.teacher?.avatarAssetKey ?? null,
    });

    await refreshCloudRegistrySummaries();
    return db;
  } finally {
    for (const id of heldGateIds) endCloudRestore(id);
  }
}

export async function hydrateClassroomFromCloud(
  classroomKey: string,
  options?: { isCancelled?: () => boolean },
): Promise<ClassroomDatabase> {
  const waiter = options?.isCancelled ?? (() => false);
  const existing = hydrateInFlight.get(classroomKey);
  if (existing) {
    existing.waiters.add(waiter);
    try {
      const db = await existing.promise;
      if (waiter()) {
        throw new HydrateCancelledError();
      }
      return db;
    } finally {
      existing.waiters.delete(waiter);
    }
  }

  const waiters = new Set<() => boolean>([waiter]);
  const promise = hydrateClassroomFromCloudInner(classroomKey, waiters).finally(() => {
    hydrateInFlight.delete(classroomKey);
  });
  hydrateInFlight.set(classroomKey, { promise, waiters });
  try {
    const db = await promise;
    if (waiter()) {
      throw new HydrateCancelledError();
    }
    return db;
  } finally {
    waiters.delete(waiter);
  }
}

export function resetRegistryPullStateForTests(): void {
  registryPullCompleted = false;
  registryPullPromise = null;
  lastMergedRegistry = null;
  hydrateInFlight.clear();
}
