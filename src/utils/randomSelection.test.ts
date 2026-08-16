import { afterEach, describe, expect, it, vi } from "vitest";
import { pickWithoutRepeat } from "./randomSelection";

const items = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
];

describe("pickWithoutRepeat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty bag when pool is empty", () => {
    const result = pickWithoutRepeat([], []);
    expect(result.selected).toBeUndefined();
    expect(result.nextBag).toEqual([]);
  });

  it("refills bag when empty and picks from full pool", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = pickWithoutRepeat(items, []);
    expect(result.selected?.id).toBe("a");
    expect(result.nextBag).toEqual(["b", "c"]);
  });

  it("depletes bag without repeating until refill", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const first = pickWithoutRepeat(items, []);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const second = pickWithoutRepeat(items, first.nextBag);
    expect(second.selected?.id).toBe("b");
    expect(second.nextBag).toEqual(["c"]);
  });

  it("refills bag after all ids are picked", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let bag: string[] = [];
    let last = pickWithoutRepeat(items, bag);
    bag = last.nextBag;
    expect(last.selected?.id).toBe("a");

    vi.spyOn(Math, "random").mockReturnValue(0);
    last = pickWithoutRepeat(items, bag);
    bag = last.nextBag;
    expect(last.selected?.id).toBe("b");

    vi.spyOn(Math, "random").mockReturnValue(0);
    last = pickWithoutRepeat(items, bag);
    bag = last.nextBag;
    expect(last.selected?.id).toBe("c");
    expect(bag).toEqual([]);

    vi.spyOn(Math, "random").mockReturnValue(0);
    const refilled = pickWithoutRepeat(items, bag);
    expect(refilled.selected?.id).toBe("a");
    expect(refilled.nextBag).toEqual(["b", "c"]);
  });

  it("drops stale ids from bag when pool changes", () => {
    const smallerPool = [{ id: "a", name: "A" }];
    const result = pickWithoutRepeat(smallerPool, ["a", "removed-id"]);
    expect(result.selected?.id).toBe("a");
    expect(result.nextBag).toEqual([]);
  });
});
