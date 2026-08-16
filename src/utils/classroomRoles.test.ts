import { describe, expect, it } from "vitest";
import { createEmptyDatabase } from "../database/database.factory";
import type { Student, Team } from "../types/models";
import {
  clearStudentLeadershipFromTeams,
  createDefaultClassroomRoles,
  getStudentClassroomRoles,
  normalizeClassroomDatabase,
  sanitizeAllTeamLeadership,
  sanitizeTeamLeadership,
} from "./classroomRoles";

describe("createDefaultClassroomRoles", () => {
  it("creates three default roles", () => {
    expect(createDefaultClassroomRoles().length).toBe(3);
  });
});

describe("sanitizeTeamLeadership", () => {
  it("clears leaders not in member set", () => {
    const team: Team = {
      id: "t1",
      name: "Đội 1",
      score: 0,
      leaderStudentId: "gone",
      viceLeaderStudentId: "s2",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    const sanitized = sanitizeTeamLeadership(team, new Set(["s2"]));
    expect(sanitized.leaderStudentId).toBeUndefined();
    expect(sanitized.viceLeaderStudentId).toBe("s2");
  });

  it("clears vice when same as leader", () => {
    const team: Team = {
      id: "t1",
      name: "Đội 1",
      score: 0,
      leaderStudentId: "s1",
      viceLeaderStudentId: "s1",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    const sanitized = sanitizeTeamLeadership(team, new Set(["s1"]));
    expect(sanitized.viceLeaderStudentId).toBeUndefined();
  });
});

describe("sanitizeAllTeamLeadership", () => {
  it("sanitizes each team based on members", () => {
    const teams: Team[] = [
      { id: "t1", name: "A", score: 0, leaderStudentId: "s1", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];
    const students: Student[] = [
      {
        id: "s1",
        name: "An",
        teamId: "t1",
        classroomRoleIds: [],
        badgeIds: [],
        points: 0,
        totalRewards: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];
    const result = sanitizeAllTeamLeadership(teams, students);
    expect(result[0].leaderStudentId).toBe("s1");
  });
});

describe("clearStudentLeadershipFromTeams", () => {
  it("removes student from leadership roles", () => {
    const teams: Team[] = [
      {
        id: "t1",
        name: "A",
        score: 0,
        leaderStudentId: "s1",
        viceLeaderStudentId: "s2",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];
    const cleared = clearStudentLeadershipFromTeams(teams, "s1");
    expect(cleared[0].leaderStudentId).toBeUndefined();
  });
});

describe("getStudentClassroomRoles", () => {
  it("returns matched roles for student", () => {
    const roles = createDefaultClassroomRoles();
    const student: Student = {
      id: "s1",
      name: "An",
      classroomRoleIds: [roles[0].id],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    expect(getStudentClassroomRoles(student, roles).length).toBe(1);
  });
});

describe("normalizeClassroomDatabase", () => {
  it("defaults cloudBackupEnabled to false", () => {
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
    delete (db.appSettings as { cloudBackupEnabled?: boolean }).cloudBackupEnabled;
    const normalized = normalizeClassroomDatabase(db);
    expect(normalized.appSettings.cloudBackupEnabled).toBe(false);
  });

  it("migrates legacy classroomRole string to ids", () => {
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
    const roleName = db.classroomRoles[0].name;
    db.students.push({
      id: "s1",
      name: "An",
      classroomRole: roleName,
      classroomRoleIds: [],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    const normalized = normalizeClassroomDatabase(db);
    expect(normalized.students[0].classroomRoleIds.length).toBe(1);
  });
});
