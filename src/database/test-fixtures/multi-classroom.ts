import { createEmptyDatabase } from "../database.factory";
import type { ClassroomDatabase } from "../types";
import type { PointAction, Reward, Student } from "@/src/types/models";

const TEACHER = {
  id: "teacher-fixture",
  name: "Fixture Teacher",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const FIXED_NOW = "2026-01-15T12:00:00.000Z";

function student(id: string, name: string, points = 0): Student {
  return {
    id,
    name,
    classroomRoleIds: [],
    badgeIds: [],
    points,
    totalRewards: 0,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };
}

function reward(id: string, name: string): Reward {
  return {
    id,
    name,
    requiredPoints: 5,
    isActive: true,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };
}

function pointAction(id: string, name: string, points: number): PointAction {
  return {
    id,
    name,
    points,
    type: points >= 0 ? "reward" : "penalty",
    isActive: true,
  };
}

export type MultiClassroomFixture = {
  label: "A" | "B" | "C";
  className: string;
  schoolYear: string;
  studentName: string;
  rewardName: string;
  actionName: string;
  db: ClassroomDatabase;
};

function buildFixture(
  label: "A" | "B" | "C",
  className: string,
  studentName: string,
  rewardName: string,
  actionName: string,
): MultiClassroomFixture {
  const schoolYear = "2026-2027";
  const db = createEmptyDatabase({
    className,
    schoolYear,
    teacher: TEACHER,
  });
  db.metadata.createdAt = FIXED_NOW;
  db.metadata.updatedAt = FIXED_NOW;
  db.students = [student(`student-${label.toLowerCase()}`, studentName, label.charCodeAt(0))];
  db.rewards = [reward(`reward-${label.toLowerCase()}`, rewardName)];
  db.pointActions = [pointAction(`action-${label.toLowerCase()}`, actionName, label.charCodeAt(0))];
  return {
    label,
    className,
    schoolYear,
    studentName,
    rewardName,
    actionName,
    db,
  };
}

export const CLASSROOM_A = buildFixture("A", "2/7", "Alice", "Apple", "Point Action A");
export const CLASSROOM_B = buildFixture("B", "3/1", "Bob", "Banana", "Point Action B");
export const CLASSROOM_C = buildFixture("C", "4/2", "Charlie", "Coconut", "Point Action C");

export function registryEntryFromFixture(fixture: MultiClassroomFixture) {
  return {
    key: fixture.db.metadata.id,
    name: fixture.className,
    schoolYear: fixture.schoolYear,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    archived: false,
  };
}

export function registrySummaryFromFixture(fixture: MultiClassroomFixture) {
  return {
    id: fixture.db.metadata.id,
    className: fixture.className,
    schoolYear: fixture.schoolYear,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    archived: false,
  };
}
