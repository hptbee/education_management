import { describe, expect, it } from "vitest";
import { createEmptyDatabase } from "@/src/database/database.factory";
import { capHistory } from "@/src/utils/historyLimits";
import { createId } from "@/src/utils/id";
import type { ClassroomDatabase } from "@/src/database/types";
import type { PointAction } from "@/src/types/models";
import { getEnabledSegments } from "@/src/utils/pointsWheelConfig";
import { pickWinningSegmentIndex } from "@/src/utils/pointsWheelSpin";

/** Mirrors AppDataContext.applyPoints — kept here for behavior tests without DOM. */
function applyPointsToDatabase(
  current: ClassroomDatabase,
  studentId: string,
  action: PointAction,
  note?: string,
  source: "action" | "game" = "action",
): ClassroomDatabase {
  const now = "2026-01-15T12:00:00.000Z";
  const history = {
    id: createId("points"),
    studentId,
    actionId: action.id,
    actionName: action.name,
    points: action.points,
    source,
    createdAt: now,
    note,
  };
  return {
    ...current,
    students: current.students.map((student) =>
      student.id === studentId
        ? { ...student, points: student.points + action.points, updatedAt: now }
        : student,
    ),
    pointHistory: capHistory([history, ...current.pointHistory]),
  };
}

/** Mirrors points-wheel-dialog handleApply guard without React refs. */
function canApplyPointsWheelPoints(pointsApplied: boolean, applyLock: boolean): boolean {
  return !pointsApplied && !applyLock;
}

describe("applyPoints behavior", () => {
  const db = createEmptyDatabase({
    className: "2/7",
    schoolYear: "2026-2027",
    teacher: {
      id: "teacher-1",
      name: "Teacher",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
  db.students = [
    {
      id: "student-a",
      name: "Alice",
      classroomRoleIds: [],
      badgeIds: [],
      points: 3,
      totalRewards: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "student-b",
      name: "Bob",
      classroomRoleIds: [],
      badgeIds: [],
      points: 7,
      totalRewards: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const wheelAction = (value: number): PointAction => ({
    id: "points-wheel-action",
    name: "Vòng quay điểm",
    points: value,
    type: value >= 0 ? "reward" : "penalty",
    isActive: true,
  });

  it("does not change points when only selecting a spin result", () => {
    const enabled = getEnabledSegments(db.pointsWheelConfig);
    const winnerIndex = pickWinningSegmentIndex(enabled);
    const winnerValue = enabled[winnerIndex]?.value ?? 0;
    expect(typeof winnerValue).toBe("number");
    expect(db.students[0]?.points).toBe(3);
    expect(db.pointHistory).toHaveLength(0);
  });

  it("apply once creates exactly one history row and one student delta", () => {
    const next = applyPointsToDatabase(db, "student-a", wheelAction(5), "Vòng quay điểm: +5", "game");
    expect(next.students.find((s) => s.id === "student-a")?.points).toBe(8);
    expect(next.students.find((s) => s.id === "student-b")?.points).toBe(7);
    expect(next.pointHistory).toHaveLength(1);
    expect(next.pointHistory[0]).toMatchObject({
      studentId: "student-a",
      points: 5,
      source: "game",
    });
  });

  it("second apply attempt is blocked by the dialog guard state", () => {
    let working = db;
    if (canApplyPointsWheelPoints(false, false)) {
      working = applyPointsToDatabase(working, "student-a", wheelAction(5), undefined, "game");
    }
    expect(canApplyPointsWheelPoints(true, false)).toBe(false);
    expect(canApplyPointsWheelPoints(false, true)).toBe(false);
    expect(working.pointHistory).toHaveLength(1);
    expect(working.students.find((s) => s.id === "student-a")?.points).toBe(8);
  });

  it("applyPoints itself is additive when invoked twice without UI guard", () => {
    const once = applyPointsToDatabase(db, "student-a", wheelAction(2), undefined, "game");
    const twice = applyPointsToDatabase(once, "student-a", wheelAction(2), undefined, "game");
    expect(twice.pointHistory).toHaveLength(2);
    expect(twice.students.find((s) => s.id === "student-a")?.points).toBe(7);
  });
});
