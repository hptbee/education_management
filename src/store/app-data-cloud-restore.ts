import type { ClassroomDatabase } from "../database/types";
import { databaseService } from "../database/database.service";
import { recordCloudRestoreSyncBaseline } from "../database/backup/cloud-restore-sync";
import { cloudDirtyTracker } from "../database/backup/cloud-dirty-tracker";
import { refreshCloudRegistrySummaries } from "../database/backup/cloud-registry.service";
import { beginCloudRestore, endCloudRestore } from "../database/backup/cloud-restore-gate";
import { logCloudTrace } from "../logging/app-log";

export type CloudAssetRestoreItem = {
  path: string;
  content: string;
  encoding?: string;
};

function extractRestoreGateId(payload: unknown): string {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const nested = record?.payload && typeof record.payload === "object" ? (record.payload as Record<string, unknown>) : null;
  const meta =
    (nested?.metadata as { id?: string } | undefined) ??
    (record?.metadata as { id?: string } | undefined);
  return typeof meta?.id === "string" ? meta.id : "restore";
}

export async function restoreClassroomFromCloudPayload(input: {
  payload: unknown;
  cloudAssets?: CloudAssetRestoreItem[];
  cancelPendingSaveForClassroom: (classroomId: string) => void;
  applyLoadedDatabase: (db: ClassroomDatabase) => void;
}): Promise<ClassroomDatabase> {
  const gateId = extractRestoreGateId(input.payload);
  const heldGateIds = new Set<string>([gateId]);

  input.cancelPendingSaveForClassroom(gateId);
  beginCloudRestore(gateId);

  try {
    logCloudTrace("info", "cloud-restore", "manual restoreFromCloudPayload", {
      assetCount: input.cloudAssets?.length ?? 0,
      paths: input.cloudAssets?.map((item) => item.path) ?? [],
    });
    const db = await databaseService.saveCloudRestoredDatabase(input.payload, {
      cloudAssets: input.cloudAssets,
      expectedClassroomId: gateId,
    });
    heldGateIds.add(db.metadata.id);
    beginCloudRestore(db.metadata.id);
    await recordCloudRestoreSyncBaseline(db);
    cloudDirtyTracker.clear(db.metadata.id);
    input.applyLoadedDatabase(db);
    await refreshCloudRegistrySummaries();
    return db;
  } finally {
    for (const id of heldGateIds) endCloudRestore(id);
  }
}
