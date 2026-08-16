import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildClassroomActivity, filterActivityEntries, formatActivityDate } from "./activityHistory";
import { createEmptyDatabase } from "../database/database.factory";

function minimalDb() {
  const db = createEmptyDatabase({
    className: "2/7",
    schoolYear: "2026-2027",
    teacher: {
      id: "t1",
      name: "Teacher",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  });
  db.students.push({
    id: "s1",
    name: "An",
    teamId: "team-1",
    classroomRoleIds: [],
    badgeIds: [],
    points: 5,
    totalRewards: 0,
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  });
  db.teams.push({
    id: "team-1",
    name: "Đội 1",
    score: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  });
  db.pointHistory.push({
    id: "ph1",
    studentId: "s1",
    actionName: "Chăm chỉ",
    points: 2,
    source: "action",
    createdAt: "2026-01-11T00:00:00.000Z",
  });
  db.rewardHistory.push({
    id: "rh1",
    studentId: "s1",
    rewardId: "r1",
    rewardName: "Kẹo",
    pointsSpent: 3,
    createdAt: "2026-01-12T00:00:00.000Z",
  });
  db.recognitions.push({
    id: "rec1",
    studentId: "s1",
    type: "title",
    title: "Ngôi sao",
    awardedPoints: 1,
    createdAt: "2026-01-13T00:00:00.000Z",
  });
  db.teamScoreHistory.push({
    id: "ts1",
    teamId: "team-1",
    points: 4,
    actionName: "Thắng",
    createdAt: "2026-01-14T00:00:00.000Z",
  });
  db.luckyWheelHistory.push({
    id: "lw1",
    studentId: "s1",
    studentIds: ["s1"],
    createdAt: "2026-01-15T00:00:00.000Z",
  });
  db.badgeAwardHistory.push({
    id: "ba1",
    badgeId: "b1",
    badgeName: "Yêu sách",
    badgeIcon: "📚",
    studentIds: ["s1"],
    createdAt: "2026-01-16T00:00:00.000Z",
  });
  return db;
}

describe("buildClassroomActivity", () => {
  it("builds sorted activity entries from database", () => {
    const entries = buildClassroomActivity(minimalDb());
    expect(entries.length).toBe(6);
    expect(entries[0].kind).toBe("badge");
  });
});

describe("filterActivityEntries", () => {
  const entries = buildClassroomActivity(minimalDb());

  it("filters by kind", () => {
    expect(filterActivityEntries(entries, { kind: "reward" }).length).toBe(1);
  });

  it("filters by student and team", () => {
    expect(filterActivityEntries(entries, { studentId: "s1" }).length).toBeGreaterThan(0);
    expect(filterActivityEntries(entries, { teamId: "team-1" }).length).toBeGreaterThan(0);
  });

  it("filters by search query", () => {
    expect(filterActivityEntries(entries, { searchQuery: "kẹo" }).length).toBe(1);
  });
});

describe("formatActivityDate", () => {
  it("formats valid iso date", () => {
    expect(formatActivityDate("2026-01-01T12:00:00.000Z")).toMatch(/\d{2}/);
  });

  it("returns fallback for invalid date", () => {
    expect(formatActivityDate("bad")).toBe("Không xác định");
  });
});
