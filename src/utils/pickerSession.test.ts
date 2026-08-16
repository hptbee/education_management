import { afterEach, describe, expect, it, vi } from "vitest";
import type { Student } from "@/src/types/models";
import {
  clampQuantity,
  createDefaultPickerSession,
  getEligibleStudents,
  getScopedStudents,
  pickUniqueStudents,
  sanitizeStudentIds,
} from "./pickerSession";

const students: Student[] = [
  { id: "s1", name: "An", classroomRoleIds: [], badgeIds: [], points: 0, totalRewards: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  { id: "s2", name: "Bình", classroomRoleIds: [], badgeIds: [], points: 0, totalRewards: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01", teamId: "t1" },
];

describe("createDefaultPickerSession", () => {
  it("returns default session shape", () => {
    const session = createDefaultPickerSession();
    expect(session.mode).toBe("single");
    expect(session.preventRepeat).toBe(true);
  });
});

describe("getScopedStudents", () => {
  it("filters by team when scope is team", () => {
    expect(getScopedStudents(students, "team", "t1").length).toBe(1);
  });

  it("returns empty when team scope without teamId", () => {
    expect(getScopedStudents(students, "team")).toEqual([]);
  });
});

describe("sanitizeStudentIds", () => {
  it("removes invalid ids", () => {
    expect(sanitizeStudentIds(["s1", "bad"], new Set(["s1"]))).toEqual(["s1"]);
  });
});

describe("getEligibleStudents", () => {
  it("excludes already picked when preventRepeat", () => {
    const eligible = getEligibleStudents(students, ["s1"], true);
    expect(eligible.map((s) => s.id)).toEqual(["s2"]);
  });

  it("returns full pool when preventRepeat is false", () => {
    expect(getEligibleStudents(students, ["s1"], false).length).toBe(2);
  });
});

describe("pickUniqueStudents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns up to count students", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const picked = pickUniqueStudents(students, 1);
    expect(picked.length).toBe(1);
  });

  it("returns empty for zero count", () => {
    expect(pickUniqueStudents(students, 0)).toEqual([]);
  });
});

describe("clampQuantity", () => {
  it("clamps between min and eligible count", () => {
    expect(clampQuantity(99, 3)).toBe(3);
    expect(clampQuantity(1, 5)).toBe(2);
  });
});
