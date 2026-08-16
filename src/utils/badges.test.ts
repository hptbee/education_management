import { describe, expect, it } from "vitest";
import type { Badge, Student } from "../types/models";
import {
  createDefaultBadges,
  DEFAULT_BADGE_SEEDS,
  getStudentBadges,
  normalizeBadgesOnDatabase,
  studentHasBadge,
} from "./badges";

describe("createDefaultBadges", () => {
  it("creates badges from seeds", () => {
    const badges = createDefaultBadges();
    expect(badges.length).toBe(DEFAULT_BADGE_SEEDS.length);
    expect(badges[0].name).toBe(DEFAULT_BADGE_SEEDS[0].name);
  });
});

describe("getStudentBadges", () => {
  it("returns badges for student ids", () => {
    const badges: Badge[] = [{ id: "b1", name: "A", createdAt: "2026-01-01" }];
    const student: Student = {
      id: "s1",
      name: "An",
      classroomRoleIds: [],
      badgeIds: ["b1", "missing"],
      points: 0,
      totalRewards: 0,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    expect(getStudentBadges(student, badges).length).toBe(1);
  });
});

describe("studentHasBadge", () => {
  it("checks badge membership", () => {
    const student: Student = {
      id: "s1",
      name: "An",
      classroomRoleIds: [],
      badgeIds: ["b1"],
      points: 0,
      totalRewards: 0,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    expect(studentHasBadge(student, "b1")).toBe(true);
    expect(studentHasBadge(student, "b2")).toBe(false);
  });
});

describe("normalizeBadgesOnDatabase", () => {
  it("creates default badges when missing", () => {
    const normalized = normalizeBadgesOnDatabase({ students: [] });
    expect(normalized.badges.length).toBeGreaterThan(0);
  });
});
