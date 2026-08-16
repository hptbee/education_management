import { assertSafeClassroomId } from "../safeIdentifiers";

const GIFT_IMAGE_PREFIX = "images/gifts/";

function assertSafeRelativeAssetPath(relativePath: string): void {
  if (!relativePath || relativePath.includes("..") || relativePath.includes("\\")) {
    throw new Error("Đường dẫn tài nguyên không hợp lệ.");
  }
  if (relativePath.startsWith("/") || /^[a-zA-Z]:/.test(relativePath)) {
    throw new Error("Đường dẫn tài nguyên không hợp lệ.");
  }
}

export function giftImageRelativePath(giftId: string, extension: string): string {
  const safeExt = extension.replace(/^\./, "").toLowerCase() || "jpg";
  return `${GIFT_IMAGE_PREFIX}${giftId}.${safeExt}`;
}

export function isGiftImagePath(path: string): boolean {
  return path.startsWith(GIFT_IMAGE_PREFIX) && !path.includes("..");
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
  assertSafeRelativeAssetPath(relativePath);
  return joinPath(dataDir, "classrooms", classroomId, relativePath);
}
