import { describe, expect, it } from "vitest";
import { enqueueWrite } from "./write-queue";

describe("enqueueWrite", () => {
  it("serializes writes in order", async () => {
    const order: number[] = [];
    let queue = Promise.resolve();

    const first = enqueueWrite(queue, async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
    });
    queue = first.nextQueue;

    const second = enqueueWrite(queue, async () => {
      order.push(2);
    });
    queue = second.nextQueue;

    await Promise.all([first.result, second.result]);
    expect(order).toEqual([1, 2]);
  });

  it("does not poison the queue after a failure", async () => {
    let queue = Promise.resolve();

    const failing = enqueueWrite(queue, async () => {
      throw new Error("fail");
    });
    queue = failing.nextQueue;

    const succeeding = enqueueWrite(queue, async () => {
      return;
    });
    queue = succeeding.nextQueue;

    await expect(failing.result).rejects.toThrow("fail");
    await expect(succeeding.result).resolves.toBeUndefined();
  });
});
