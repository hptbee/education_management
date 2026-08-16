import { describe, expect, it } from "vitest";
import { buildClassroomActivity, filterActivityEntries } from "./activityHistory";
import type { ClassroomDatabase } from "../database/types";

function minimalDb(overrides: Partial<ClassroomDatabase> = {}): ClassroomDatabase {
  return {
    metadata: {
      id: "test-class",
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    classroomSettings: {
      id: "test-class",
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: {
        id: "teacher-1",
        name: "Teacher",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    students: [
      {
        id: "s1",
        name: "An",
        points: 10,
        teamId: "team-a",
        classroomRoleIds: [],
        badgeIds: [],
        totalRewards: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "s2",
        name: "Bình",
        points: 5,
        teamId: "team-b",
        classroomRoleIds: [],
        badgeIds: [],
        totalRewards: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    teams: [
      {
        id: "team-a",
        name: "Tổ 1",
        score: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "team-b",
        name: "Tổ 2",
        score: 5,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    pointActions: [],
    pointHistory: [],
    rewards: [],
    rewardHistory: [],
    recognitions: [],
    teamScoreHistory: [],
    classroomRoles: [],
    badges: [],
    recognitionTitles: [],
    luckyWheelHistory: [],
    badgeAwardHistory: [],
    wheelStudentBag: [],
    appSettings: { soundEnabled: true, animationsEnabled: true, cloudBackupEnabled: false },
    ...overrides,
  };
}

describe("activityHistory", () => {
  it("sets teamId on student-scoped point entries", () => {
    const db = minimalDb({
      pointHistory: [
        {
          id: "ph-1",
          studentId: "s1",
          actionId: "a1",
          actionName: "Trả lời",
          points: 2,
          source: "action",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });

    const entries = buildClassroomActivity(db);
    expect(entries[0].teamId).toBe("team-a");
  });

  it("filters by teamId and studentIds on multi-student badge awards", () => {
    const db = minimalDb({
      badgeAwardHistory: [
        {
          id: "ba-1",
          badgeId: "badge-1",
          badgeName: "Ngôi sao",
          badgeIcon: "⭐",
          studentIds: ["s2"],
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ],
    });

    const entries = buildClassroomActivity(db);
    const byTeam = filterActivityEntries(entries, { teamId: "team-b" });
    expect(byTeam).toHaveLength(1);

    const byStudent = filterActivityEntries(entries, { studentId: "s2" });
    expect(byStudent).toHaveLength(1);
  });
});
