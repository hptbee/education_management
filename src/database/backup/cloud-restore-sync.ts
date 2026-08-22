import type { ClassroomDatabase } from "../types";
import { backupMetadataService } from "./backup-metadata.service";
import { CLOUD_SYNC_STATE_VERSION } from "./cloud-types";
import {
  serializeCloudFilesForUpload,
  simpleHash,
  splitClassroomToCloudFiles,
} from "./cloud-serializer";

/** After cloud restore/hydrate: align local sync metadata with restored JSON so startup backup does not immediately re-upload. */
export async function recordCloudRestoreSyncBaseline(db: ClassroomDatabase): Promise<void> {
  const classroomKey = db.metadata.id;
  await backupMetadataService.recordCloudBackupSuccess(classroomKey, db.metadata.updatedAt);

  const split = splitClassroomToCloudFiles(db, { migrationComplete: true });
  const uploads = serializeCloudFilesForUpload(split.files, split.paths);
  const fileHashes: Record<string, string> = {};
  for (const file of uploads) {
    fileHashes[file.path] = simpleHash(file.content);
  }

  await backupMetadataService.updateCloudSyncState(classroomKey, {
    formatVersion: CLOUD_SYNC_STATE_VERSION,
    fileHashes,
    migratedToStructured: true,
  });
}
