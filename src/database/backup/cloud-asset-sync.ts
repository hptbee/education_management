import { classroomAssetService } from "../assets/classroom-asset.service";
import {
  bannerAssetKey,
  classAvatarAssetKey,
  isAllowedCloudAssetPath,
  mimeFromAssetPath,
  teacherAvatarAssetKey,
} from "../assets/classroom-asset-paths";
import type { ClassroomDatabase } from "../types";
import type { CloudDirtyState, CloudFileUpload, CloudSyncStateEntry } from "./cloud-types";
import { logCloudTrace } from "@/src/logging/app-log";
import { isTauri } from "../tauri-fs.service";

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

/** Fill JSON asset keys from restored binaries when classroom.json omitted them. */
export function applyAssetKeysFromRestoredPaths(
  db: ClassroomDatabase,
  assets: Array<{ path: string }>,
): ClassroomDatabase {
  const paths = new Set(assets.map((asset) => normalizeAssetPath(asset.path)).filter(Boolean));
  if (paths.size === 0) return db;

  let classroomSettings = db.classroomSettings;
  let changed = false;

  const teacherKey = teacherAvatarAssetKey();
  if (paths.has(teacherKey) && classroomSettings.teacher && !classroomSettings.teacher.avatarAssetKey) {
    classroomSettings = {
      ...classroomSettings,
      teacher: { ...classroomSettings.teacher, avatarAssetKey: teacherKey },
    };
    changed = true;
  }

  const bannerKey = bannerAssetKey();
  if (paths.has(bannerKey) && !classroomSettings.bannerAssetKey) {
    classroomSettings = { ...classroomSettings, bannerAssetKey: bannerKey };
    changed = true;
  }

  const classKey = classAvatarAssetKey();
  if (paths.has(classKey) && !classroomSettings.classAvatarAssetKey) {
    classroomSettings = { ...classroomSettings, classAvatarAssetKey: classKey };
    changed = true;
  }

  const students = db.students.map((student) => {
    const key = `assets/students/${student.id}/avatar.webp`;
    if (paths.has(key) && !student.avatarAssetKey) {
      changed = true;
      return { ...student, avatarAssetKey: key };
    }
    return student;
  });

  const rewards = db.rewards.map((gift) => {
    const key = `assets/rewards/${gift.id}/image.webp`;
    if (paths.has(key) && !gift.imagePath) {
      changed = true;
      return { ...gift, imagePath: key };
    }
    return gift;
  });

  if (!changed) return db;
  return { ...db, classroomSettings, students, rewards };
}

export async function restoreCloudAssetsLocally(
  classroomId: string,
  assets: Array<{ path: string; content: string; encoding?: string }>,
): Promise<number> {
  let written = 0;
  let skipped = 0;
  for (const asset of assets) {
    const path = normalizeAssetPath(asset.path);
    if (!path || !isAllowedCloudAssetPath(path)) {
      skipped += 1;
      logCloudTrace("warn", "cloud-restore", "asset path rejected", { path: asset.path, classroomId });
      continue;
    }
    if (asset.encoding && asset.encoding !== "base64") {
      skipped += 1;
      logCloudTrace("warn", "cloud-restore", "asset encoding rejected", {
        path,
        encoding: asset.encoding,
        classroomId,
      });
      continue;
    }
    const binary = atob(asset.content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    try {
      await classroomAssetService.saveAsset(classroomId, path, bytes);
      written += 1;
    } catch (error) {
      skipped += 1;
      logCloudTrace("error", "cloud-restore", "asset write failed", {
        classroomId,
        path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  logCloudTrace("info", "cloud-restore", "wrote local assets", {
    classroomId,
    written,
    skipped,
    isTauri: isTauri(),
  });
  return written;
}
