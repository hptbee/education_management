import { classroomAssetService } from "../assets/classroom-asset.service";
import { isAllowedCloudAssetPath, mimeFromAssetPath } from "../assets/classroom-asset-paths";
import type { ClassroomDatabase } from "../types";
import type { CloudDirtyState, CloudFileUpload, CloudSyncStateEntry } from "./cloud-types";

function normalizeAssetPath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export async function serializeDirtyAssetsForUpload(
  classroomId: string,
  assetKeys: string[],
): Promise<CloudFileUpload[]> {
  const uploads: CloudFileUpload[] = [];

  for (const key of [...new Set(assetKeys)]) {
    const path = normalizeAssetPath(key);
    if (!path || !isAllowedCloudAssetPath(path)) continue;
    const bytes = await classroomAssetService.readAsset(classroomId, key);
    if (!bytes || bytes.length === 0) continue;
    uploads.push({
      path,
      content: bytesToBase64(bytes),
      encoding: "base64",
      contentType: mimeFromAssetPath(key),
    });
  }

  return uploads;
}

/** Asset keys to include in the next cloud sync batch. */
export async function collectAssetKeysForCloudSync(
  classroomId: string,
  db: ClassroomDatabase,
  dirty: CloudDirtyState,
  options: { forceFull: boolean; syncState: CloudSyncStateEntry },
): Promise<string[]> {
  const keys = new Set<string>(dirty.dirtyAssets);

  const referenced = classroomAssetService.collectReferencedAssetKeys(db);
  if (options.forceFull) {
    for (const key of referenced) keys.add(key);
    try {
      const onDisk = await classroomAssetService.listAssets(classroomId);
      for (const path of onDisk) {
        if (isAllowedCloudAssetPath(path)) keys.add(path);
      }
    } catch {
      // listAssets optional — referenced keys still upload
    }
    return [...keys];
  }

  if (dirty.classroom) {
    const settings = db.classroomSettings;
    if (settings.teacher?.avatarAssetKey) keys.add(settings.teacher.avatarAssetKey);
    if (settings.bannerAssetKey) keys.add(settings.bannerAssetKey);
    if (settings.classAvatarAssetKey) keys.add(settings.classAvatarAssetKey);
  }
  if (dirty.students) {
    for (const student of db.students) {
      if (student.avatarAssetKey) keys.add(student.avatarAssetKey);
    }
  }
  if (dirty.rewards) {
    for (const gift of db.rewards) {
      if (gift.imagePath) keys.add(gift.imagePath);
    }
  }

  // Catch-up: JSON synced but binaries never uploaded (e.g. migration completed without assets).
  for (const key of referenced) {
    if (!options.syncState.fileHashes[key]) {
      keys.add(key);
    }
  }

  return [...keys];
}

export async function restoreCloudAssetsLocally(
  classroomId: string,
  assets: Array<{ path: string; content: string; encoding?: string }>,
): Promise<void> {
  for (const asset of assets) {
    if (!isAllowedCloudAssetPath(asset.path)) continue;
    if (asset.encoding !== "base64") continue;
    const binary = atob(asset.content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    await classroomAssetService.saveAsset(classroomId, asset.path, bytes);
  }
}
