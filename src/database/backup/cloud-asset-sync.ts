import { classroomAssetService } from "../assets/classroom-asset.service";
import { isAllowedCloudAssetPath, mimeFromAssetPath } from "../assets/classroom-asset-paths";
import type { CloudFileUpload } from "./cloud-types";

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
    if (!isAllowedCloudAssetPath(key)) continue;
    const bytes = await classroomAssetService.readAsset(classroomId, key);
    if (!bytes || bytes.length === 0) continue;
    uploads.push({
      path: key,
      content: bytesToBase64(bytes),
      encoding: "base64",
      contentType: mimeFromAssetPath(key),
    });
  }

  return uploads;
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
