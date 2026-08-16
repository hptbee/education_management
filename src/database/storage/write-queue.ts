/** Serializes async writes; failures reject the caller but do not poison later writes. */
export function enqueueWrite(
  queue: Promise<void>,
  task: () => Promise<void>,
): { nextQueue: Promise<void>; result: Promise<void> } {
  const result = queue.then(task);
  const nextQueue = result.catch((error) => {
    console.warn("[enqueueWrite] write task failed", error);
  });
  return { nextQueue, result };
}
