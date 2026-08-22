/** Blocks automatic cloud uploads while classroom restore/hydrate is in progress. */

const activeRestores = new Set<string>();

export function beginCloudRestore(classroomId: string): void {
  activeRestores.add(classroomId);
}

/** Release one classroom id. Concurrent restores of other classrooms stay gated. */
export function endCloudRestore(classroomId: string): void {
  activeRestores.delete(classroomId);
}

export function isCloudRestoreInProgress(classroomId?: string): boolean {
  if (activeRestores.size === 0) return false;
  if (!classroomId) return true;
  return activeRestores.has(classroomId);
}

export function resetCloudRestoreGateForTests(): void {
  activeRestores.clear();
}
