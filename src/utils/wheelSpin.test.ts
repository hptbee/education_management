import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRandomSpinPlan,
  getSegmentMidAngle,
  getWheelDisplayName,
  getWinnerRotation,
} from "./wheelSpin";

describe("createRandomSpinPlan", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns plan within configured bounds", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const plan = createRandomSpinPlan();
    expect(plan.durationSec).toBeGreaterThanOrEqual(6.5);
    expect(plan.durationMs).toBeGreaterThan(0);
    expect(plan.extraTurns).toBeGreaterThanOrEqual(8);
  });
});

describe("getSegmentMidAngle", () => {
  it("returns midpoint angle", () => {
    expect(getSegmentMidAngle(0, 4)).toBe(45);
  });

  it("returns 0 for empty wheel", () => {
    expect(getSegmentMidAngle(0, 0)).toBe(0);
  });
});

describe("getWinnerRotation", () => {
  it("increases rotation for winner", () => {
    const next = getWinnerRotation(0, 1, 4, 2);
    expect(next).toBeGreaterThan(0);
  });
});

describe("getWheelDisplayName", () => {
  it("keeps short names", () => {
    expect(getWheelDisplayName("An Bình")).toBe("An Bình");
  });

  it("uses last two words for long names", () => {
    expect(getWheelDisplayName("Nguyễn Văn An Bình")).toBe("An Bình");
  });
});
