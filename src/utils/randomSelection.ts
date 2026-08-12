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
