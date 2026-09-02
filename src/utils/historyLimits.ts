/** Optional display window — writes no longer truncate classroom history. */
export const MAX_HISTORY_ENTRIES = 2000;

export function capHistory<T>(entries: T[]): T[] {
  if (entries.length <= MAX_HISTORY_ENTRIES) return entries;
  return entries.slice(0, MAX_HISTORY_ENTRIES);
}
