import type { ClassroomDatabase } from "../types";
import { backupMetadataService } from "./backup-metadata.service";
import {
  buildClassroomsRegistry,
  buildClassroomsRegistryFromSummaries,
  buildRegistryEntry,
  pathsForDomains,
  serializeCloudFilesForUpload,
  simpleHash,
  splitClassroomToCloudFiles,
  domainsFromDirty,
} from "./cloud-serializer";
import type { CloudDirtyState, CloudSyncDomain } from "./cloud-types";
import { CLOUD_SYNC_STATE_VERSION } from "./cloud-types";
import {
  getCloudBackupUrl,
  resolveEntitlementToken,
  isCloudBackupEnabledForDatabase,
} from "./cloud-backup.service";

export interface CloudSyncUploadResult {
  uploadedPaths: string[];
  skippedPaths: string[];
}

export interface CloudSyncUploadOptions {
  allLocalClassrooms?: ClassroomDatabase[];
  registrySummaries?: Array<{
    id: string;
    className: string;
    schoolYear: string;
    createdAt: string;
    updatedAt: string;
  }>;
  fetchImpl?: typeof fetch;
  forceFull?: boolean;
}

export async function uploadCloudSyncBatch(
  db: ClassroomDatabase,
  dirty: CloudDirtyState,
  options?: CloudSyncUploadOptions,
): Promise<CloudSyncUploadResult> {
  const baseUrl = getCloudBackupUrl();
  if (!baseUrl || !isCloudBackupEnabledForDatabase(db)) {
    return { uploadedPaths: [], skippedPaths: [] };
  }

  const token = await resolveEntitlementToken();
  if (!token) {
    throw new Error("Cloud backup not authorized");
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const classroomKey = db.metadata.id;
  const syncState = await backupMetadataService.getCloudSyncState(classroomKey);
  const forceFull = options?.forceFull || !syncState.migratedToStructured;

  const split = splitClassroomToCloudFiles(db, { migrationComplete: true });

  let domains: CloudSyncDomain[] = domainsFromDirty(dirty);
  if (forceFull) {
    const activityDomains: CloudSyncDomain[] = split.paths
      .filter((p) => p.startsWith("activity/") && p !== "activity/index.json")
      .map((p) => `activity:${p.slice("activity/".length, -".json".length)}` as CloudSyncDomain);
    domains = [
      "classroom",
      "students",
      "teams",
      "roles",
      "recognitions",
      "rewards",
      "settings",
      "catalog",
      "activityIndex",
      ...activityDomains,
      "registry",
    ];
  }

  const paths = pathsForDomains(domains, split);
  const allActivityPaths = split.paths.filter((p) => p.startsWith("activity/") && p !== "activity/index.json");
  if (dirty.activityDates.length > 0) {
    for (const date of dirty.activityDates) {
      const path = `activity/${date}.json`;
      if (split.paths.includes(path) && !paths.includes(path)) {
        paths.push(path);
      }
    }
  }

  if (forceFull) {
    for (const path of allActivityPaths) {
      if (!paths.includes(path)) paths.push(path);
    }
  }

  const uploads = serializeCloudFilesForUpload(split.files, paths);
  const toUpload: typeof uploads = [];
  const skippedPaths: string[] = [];

  for (const file of uploads) {
    const hash = simpleHash(file.content);
    if (!forceFull && syncState.fileHashes[file.path] === hash) {
      skippedPaths.push(file.path);
      continue;
    }
    toUpload.push(file);
  }

  if (toUpload.length === 0 && !dirty.registry && !forceFull) {
    return { uploadedPaths: [], skippedPaths };
  }

  let registry: string | undefined;
  if (dirty.registry || forceFull) {
    if (options?.allLocalClassrooms?.length) {
      const entries = options.allLocalClassrooms.map(buildRegistryEntry);
      const registryFile = buildClassroomsRegistry(entries, db.metadata.updatedAt);
      registry = JSON.stringify(registryFile, null, 2);
    } else if (options?.registrySummaries?.length) {
      const registryFile = buildClassroomsRegistryFromSummaries(
        options.registrySummaries,
        db.metadata.updatedAt,
      );
      registry = JSON.stringify(registryFile, null, 2);
    } else {
      const registryFile = buildClassroomsRegistry([buildRegistryEntry(db)], db.metadata.updatedAt);
      registry = JSON.stringify(registryFile, null, 2);
    }
  }

  const body = {
    classroomKey,
    files: toUpload,
    registry,
  };

  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/sync`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Cloud sync failed (${response.status})`);
  }

  const uploadedPaths = toUpload.map((f) => f.path);
  const nextHashes = { ...syncState.fileHashes };
  for (const file of toUpload) {
    nextHashes[file.path] = simpleHash(file.content);
  }

  await backupMetadataService.updateCloudSyncState(classroomKey, {
    formatVersion: CLOUD_SYNC_STATE_VERSION,
    fileHashes: nextHashes,
    migratedToStructured: true,
  });

  return { uploadedPaths, skippedPaths };
}

export async function uploadStructuredMigration(
  db: ClassroomDatabase,
  options?: { allLocalClassrooms?: ClassroomDatabase[]; fetchImpl?: typeof fetch },
): Promise<void> {
  const dirty: CloudDirtyState = {
    classroom: true,
    students: true,
    teams: true,
    roles: true,
    recognitions: true,
    rewards: true,
    settings: true,
    catalog: true,
    activityIndex: true,
    activityDates: [],
    registry: true,
  };
  await uploadCloudSyncBatch(db, dirty, { ...options, forceFull: true });
}
