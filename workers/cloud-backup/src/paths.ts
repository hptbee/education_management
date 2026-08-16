export function sanitizeBackupIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

/** @deprecated Legacy device-based layout — not used for new uploads */
export function buildLegacyBackupStorageKey(deviceId: string, classroomId: string): string {
  const safeDevice = sanitizeBackupIdentifier(deviceId);
  const safeClassroom = sanitizeBackupIdentifier(classroomId);
  if (!safeDevice || !safeClassroom) {
    throw new Error("Invalid backup identifiers");
  }
  return `backups/${safeDevice}/${safeClassroom}/latest.json`;
}

export function buildUserClassroomKey(userId: string, classroomId: string): string {
  const safeUser = sanitizeBackupIdentifier(userId);
  const safeClassroom = sanitizeBackupIdentifier(classroomId);
  if (!safeUser || !safeClassroom) {
    throw new Error("Invalid backup identifiers");
  }
  return `users/${safeUser}/classrooms/${safeClassroom}/database.json`;
}

export function buildUserClassroomsPrefix(userId: string): string {
  const safeUser = sanitizeBackupIdentifier(userId);
  if (!safeUser) {
    throw new Error("Invalid user id");
  }
  return `users/${safeUser}/classrooms/`;
}
