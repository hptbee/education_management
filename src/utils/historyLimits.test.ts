import { describe, expect, it } from "vitest";
import { capHistory, MAX_HISTORY_ENTRIES } from "./historyLimits";

describe("capHistory", () => {
  it("returns entries unchanged when under cap", () => {
    const entries = [1, 2, 3];
    expect(capHistory(entries)).toEqual(entries);
  });

  it("keeps only the first MAX_HISTORY_ENTRIES when over cap", () => {
    const entries = Array.from({ length: MAX_HISTORY_ENTRIES + 5 }, (_, i) => i);
    const capped = capHistory(entries);
    expect(capped.length).toBe(MAX_HISTORY_ENTRIES);
    expect(capped[0]).toBe(0);
    expect(capped[MAX_HISTORY_ENTRIES - 1]).toBe(MAX_HISTORY_ENTRIES - 1);
  });
});
