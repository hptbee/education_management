import { assertSafeClassroomId } from "../safeIdentifiers";

/** New unified asset prefix under each classroom directory. */
export const ASSET_PREFIX = "assets/";

/** Legacy gift image prefix (migrated to assets/rewards/{id}/image.webp). */
const LEGACY_GIFT_IMAGE_PREFIX = "images/gifts/";

function assertSafeRelativeAssetPath(relativePath: string): void {
  if (!relativePath || relativePath.includes("..") || relativePath.includes("\\")) {
    throw new Error("Đường dẫn tài nguyên không hợp lệ.");
  }
  if (relativePath.startsWith("/") || /^[a-zA-Z]:/.test(relativePath)) {
    throw new Error("Đường dẫn tài nguyên không hợp lệ.");
  }
}

export function teacherAvatarAssetKey(): string {
  return `${ASSET_PREFIX}teacher/avatar.webp`;
}

export function bannerAssetKey(): string {
  return `${ASSET_PREFIX}banner.webp`;
}

export function classAvatarAssetKey(): string {
  return `${ASSET_PREFIX}classroom/avatar.webp`;
}

export function studentAvatarAssetKey(studentId: string): string {
  return `${ASSET_PREFIX}students/${studentId}/avatar.webp`;
}

export function giftImageAssetKey(giftId: string): string {
  return `${ASSET_PREFIX}rewards/${giftId}/image.webp`;
}

/** @deprecated Legacy path — use giftImageAssetKey */
export function giftImageRelativePath(giftId: string, extension: string): string {
  const safeExt = extension.replace(/^\./, "").toLowerCase() || "jpg";
  return `${LEGACY_GIFT_IMAGE_PREFIX}${giftId}.${safeExt}`;
}

export function isLegacyGiftImagePath(path: string): boolean {
  return path.startsWith(LEGACY_GIFT_IMAGE_PREFIX) && !path.includes("..");
}

/** @deprecated Use isLegacyGiftImagePath */
export const isGiftImagePath = isLegacyGiftImagePath;

export function isClassroomAssetPath(path: string): boolean {
  if (!path || path.includes("..")) return false;
  return path.startsWith(ASSET_PREFIX) || isLegacyGiftImagePath(path);
}

/** Paths allowed for cloud sync upload under a classroom prefix. */
export function isAllowedCloudAssetPath(path: string): boolean {
  if (!isClassroomAssetPath(path)) return false;
  if (path === teacherAvatarAssetKey()) return true;
  if (path === bannerAssetKey()) return true;
  if (path === classAvatarAssetKey()) return true;
  if (/^assets\/students\/[^/]+\/avatar\.webp$/.test(path)) return true;
  if (/^assets\/rewards\/[^/]+\/image\.webp$/.test(path)) return true;
  if (isLegacyGiftImagePath(path)) return true;
  return false;
}

export function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/jpeg":
    case "image/jpg":
    default:
      return "jpg";
  }
}

export function extensionFromFileName(fileName: string): string {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

export function mimeFromAssetPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

export function classroomAssetRootRelative(classroomId: string): string {
  assertSafeClassroomId(classroomId, "classroomId");
  return `classrooms/${classroomId}`;
}

export function resolveClassroomAssetAbsolute(
  dataDir: string,
  classroomId: string,
  relativePath: string,
  joinPath: (...parts: string[]) => string,
): string {
  assertSafeClassroomId(classroomId, "classroomId");
  const normalized = relativePath.replace(/\\/g, "/");
  assertSafeRelativeAssetPath(normalized);
  const segments = normalized.split("/").filter(Boolean);
  return joinPath(dataDir, "classrooms", classroomId, ...segments);
}

/** Path relative to the Tauri data dir — avoids Windows `\\?\` vs `C:\` scope mismatches. */
export function classroomAssetPathFromDataRoot(classroomId: string, relativePath: string): string {
  assertSafeClassroomId(classroomId, "classroomId");
  const normalized = relativePath.replace(/\\/g, "/");
  assertSafeRelativeAssetPath(normalized);
  const segments = normalized.split("/").filter(Boolean);
  return ["classrooms", classroomId, ...segments].join("/");
}

export function parentDirForAsset(relativePath: string): string {
  const idx = relativePath.lastIndexOf("/");
  return idx >= 0 ? relativePath.slice(0, idx) : "";
}
