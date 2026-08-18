import { describe, expect, it } from "vitest";
import type { Student, Team } from "@/src/types/models";
import {
  getStudentAvatar,
  getStudentRosterOrder,
  sortStudents,
  sortStudentsByClassroomRoleThenStt,
  sortTeamMembersByLeadershipThenStt,
  studentHasClassroomRole,
} from "./student";

const roster: Student[] = [
  {
    id: "s1",
    name: "An",
    classroomRoleIds: ["role-1"],
    badgeIds: [],
    points: 5,
    totalRewards: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "s2",
    name: "Bình",
    classroomRoleIds: [],
    badgeIds: [],
    points: 10,
    totalRewards: 0,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("getStudentAvatar", () => {
  it("returns legacy inline avatar when still present", () => {
    expect(getStudentAvatar({ id: "s1", avatar: "data:image/png;base64,x", gender: "male" })).toContain("data:image");
  });

  it("uses gender fallback when only asset key is set", () => {
    expect(
      getStudentAvatar({ id: "s1", avatarAssetKey: "assets/students/s1/avatar.webp", gender: "male" }),
    ).toMatch(/avatar-boy/);
  });

  it("returns boy avatar for male", () => {
    expect(getStudentAvatar({ id: "s1", gender: "male" })).toMatch(/avatar-boy/);
  });

  it("returns girl avatar for female", () => {
    expect(getStudentAvatar({ id: "s1", gender: "female" })).toMatch(/avatar-girl/);
  });
});

describe("getStudentRosterOrder", () => {
  it("returns index in roster", () => {
    expect(getStudentRosterOrder(roster[0], roster)).toBe(0);
  });
});

describe("studentHasClassroomRole", () => {
  it("detects role ids", () => {
    expect(studentHasClassroomRole(roster[0])).toBe(true);
    expect(studentHasClassroomRole(roster[1])).toBe(false);
  });
});

describe("sortStudentsByClassroomRoleThenStt", () => {
  it("sorts role holders first", () => {
    const sorted = sortStudentsByClassroomRoleThenStt(roster, roster);
    expect(sorted[0].id).toBe("s1");
  });
});

describe("sortStudents", () => {
  it("sorts by points descending", () => {
    const sorted = sortStudents(roster, roster, "points-desc");
    expect(sorted[0].id).toBe("s2");
  });

  it("sorts by team order", () => {
    const teams: Team[] = [
      { id: "t2", name: "B", score: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "t1", name: "A", score: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];
    const students = [
      { ...roster[0], teamId: "t2" },
      { ...roster[1], teamId: "t1" },
    ];
    const sorted = sortStudents(students, roster, "team", teams);
    expect(sorted[0].teamId).toBe("t2");
  });
});

describe("sortTeamMembersByLeadershipThenStt", () => {
  it("orders leader before members", () => {
    const team: Team = {
      id: "t1",
      name: "A",
      score: 0,
      leaderStudentId: "s2",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    const members = [
      { ...roster[0], teamId: "t1" },
      { ...roster[1], teamId: "t1" },
    ];
    const sorted = sortTeamMembersByLeadershipThenStt(members, team, roster);
    expect(sorted[0].id).toBe("s2");
  });
});
