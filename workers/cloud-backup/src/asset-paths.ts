/** Cloud sync allowlist — mirrors client `classroom-asset-paths.ts`. */

export function normalizeSyncRelativePath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

export function isAllowedCloudAssetPath(path: string): boolean {
  const normalized = normalizeSyncRelativePath(path);
  if (!normalized || normalized.includes("..")) return false;
  if (normalized === "assets/teacher/avatar.webp") return true;
  if (normalized === "assets/banner.webp") return true;
  if (normalized === "assets/classroom/avatar.webp") return true;
  if (/^assets\/students\/[^/]+\/avatar\.webp$/.test(normalized)) return true;
  if (/^assets\/rewards\/[^/]+\/image\.webp$/.test(normalized)) return true;
  if (normalized.startsWith("images/gifts/") && !normalized.includes("..")) return true;
  return false;
}
