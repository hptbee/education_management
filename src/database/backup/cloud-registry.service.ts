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
} from "./cloud-backup.service";
import { uploadRegistryMerge } from "./cloud-sync.service";
import type { ClassroomDatabase } from "../types";
import { logAppEvent } from "@/src/logging/app-log";

export type PullRegistryResult =
  | { ok: true; registry: CloudClassroomsRegistryFile; source: "registry" | "legacy" }
  | { ok: false; reason: "not_configured" | "unauthorized" | "network" };

let registryPullCompleted = false;
let registryPullPromise: Promise<PullRegistryResult> | null = null;

export function isRegistryPullCompleted(): boolean {
  return registryPullCompleted;
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
}

export async function pullClassroomRegistry(fetchImpl?: typeof fetch): Promise<PullRegistryResult> {
  if (!getCloudBackupUrl()) {
    return { ok: false, reason: "not_configured" };
  }

  const token = await resolveEntitlementToken();
  if (!token) {
    return { ok: false, reason: "unauthorized" };
  }

  try {
    const fetched = await fetchClassroomsRegistry(token, fetchImpl);
    if (fetched.source === "registry" && fetched.registry) {
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
  await refreshCloudRegistrySummaries();
}

export async function ensureRegistryPulled(fetchImpl?: typeof fetch): Promise<PullRegistryResult> {
  if (registryPullCompleted) {
    return { ok: true, registry: { version: 1, updatedAt: new Date().toISOString(), classrooms: [] }, source: "registry" };
  }

  if (!registryPullPromise) {
    registryPullPromise = pullClassroomRegistry(fetchImpl).then(async (result) => {
      if (result.ok) {
        await mergeAndRememberRegistry(result.registry);
        registryPullCompleted = true;
      }
      return result;
    });
  }

  return registryPullPromise;
}

export async function pullAndMergeAccountRegistry(fetchImpl?: typeof fetch): Promise<PullRegistryResult> {
  if (!(await isCloudBackupConfigured())) {
    return { ok: false, reason: "not_configured" };
  }

  const result = await ensureRegistryPulled(fetchImpl);
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
}

export async function hydrateClassroomFromCloud(classroomKey: string): Promise<ClassroomDatabase> {
  const token = await resolveEntitlementToken();
  if (!token) {
    throw new Error("Cloud backup not authorized");
  }

  const payload = await restoreCloudClassroom(token, classroomKey);
  if (!payload) {
    throw new Error("Không tìm thấy bản sao lưu trên đám mây.");
  }

  const assets = await restoreCloudClassroomAssets(token, classroomKey);
  const db = await databaseService.saveCloudRestoredDatabase(payload, { cloudAssets: assets });

  await refreshCloudRegistrySummaries();
  return db;
}

export function resetRegistryPullStateForTests(): void {
  registryPullCompleted = false;
  registryPullPromise = null;
}
