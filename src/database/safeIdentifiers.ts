/** Safe identifier charset for classroom IDs, backup keys, and on-disk filenames. */
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isSafeClassroomId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return false;
  return SAFE_ID_PATTERN.test(trimmed);
}

export function assertSafeClassroomId(value: string, label = "metadata.id"): void {
  if (!isSafeClassroomId(value)) {
    throw new Error(
      `Mã dữ liệu lớp không hợp lệ (${label}): chỉ cho phép chữ, số, gạch ngang và gạch dưới. Hãy chỉnh metadata.id trong file JSON hoặc xuất lại từ ứng dụng.`,
    );
  }
}

export function sanitizeBackupIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!SAFE_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}
