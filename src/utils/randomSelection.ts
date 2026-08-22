export function pickWithoutRepeat<T extends { id: string }>(
  items: T[],
  bag: string[],
): { selected?: T; nextBag: string[] } {
  if (items.length === 0) {
    return { nextBag: [] };
  }

  const availableIds = items.map((item) => item.id);
  const currentBag = bag.filter((id) => availableIds.includes(id));
  const refillBag = currentBag.length > 0 ? currentBag : availableIds;
  const selectedId = refillBag[Math.floor(Math.random() * refillBag.length)];
  const selected = items.find((item) => item.id === selectedId);

  return {
    selected,
    nextBag: refillBag.filter((id) => id !== selectedId),
  };
}

/** Pick up to `count` unique student ids from a fair bag (refill from pool when empty). */
export function pickStudentIdsFromBag(
  pool: { id: string }[],
  bag: string[],
  count: number,
): { pickedIds: string[]; nextBag: string[] } {
  if (count <= 0 || pool.length === 0) {
    return { pickedIds: [], nextBag: bag };
  }

  const poolIds = new Set(pool.map((item) => item.id));
  let workingBag = bag.filter((id) => poolIds.has(id));
  if (workingBag.length === 0) {
    workingBag = pool.map((item) => item.id);
  }

  const picked: string[] = [];
  let remaining = [...workingBag];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const idx = Math.floor(Math.random() * remaining.length);
    const id = remaining[idx]!;
    picked.push(id);
    remaining = remaining.filter((_, j) => j !== idx);
  }

  const pickedSet = new Set(picked);
  const nextBag = workingBag.filter((id) => !pickedSet.has(id));
  return { pickedIds: picked, nextBag };
}
