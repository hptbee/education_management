import { describe, expect, it } from "vitest";
import type { PointHistory, Student, Team, TeamScoreHistory } from "@/src/types/models";
import {
  buildStudentRanking,
  buildTeamRanking,
  filterRankedStudents,
  getPodiumEntries,
  groupRankedByRank,
  rankStudents,
  rankTeams,
  sumPointsByStudent,
  sumScoresByTeam,
} from "./ranking";

function student(id: string, name: string, points: number, teamId?: string, gender?: Student["gender"]): Student {
  return {
    id,
    name,
    classroomRoleIds: [],
    badgeIds: [],
    points,
    totalRewards: 0,
    teamId,
    gender,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("rankStudents", () => {
  it("assigns dense ranks with ties", () => {
    const ranked = rankStudents([
      student("s1", "An", 10),
      student("s2", "Bình", 10),
      student("s3", "Chi", 5),
    ]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
    expect(ranked[2].rank).toBe(2);
  });
});

describe("sumPointsByStudent", () => {
  it("sums history within date range", () => {
    const history: PointHistory[] = [
      { id: "h1", studentId: "s1", actionName: "A", points: 5, source: "action", createdAt: "2026-01-15T10:00:00.000Z" },
      { id: "h2", studentId: "s1", actionName: "B", points: 3, source: "action", createdAt: "2025-01-01T10:00:00.000Z" },
    ];
    const totals = sumPointsByStudent(history, new Date("2026-01-01"), new Date("2026-12-31"));
    expect(totals.get("s1")).toBe(5);
  });
});

describe("buildStudentRanking", () => {
  it("uses all-time points by default", () => {
    const students = [student("s1", "An", 20), student("s2", "Bình", 5)];
    const ranked = buildStudentRanking(students, [], "all-time");
    expect(ranked[0].student.id).toBe("s1");
    expect(ranked[0].points).toBe(20);
  });
});

describe("buildTeamRanking", () => {
  it("ranks teams by score", () => {
    const teams: Team[] = [
      { id: "t1", name: "Đội 1", score: 30, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "t2", name: "Đội 2", score: 10, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];
    const ranked = buildTeamRanking(teams, [], "all-time");
    expect(ranked[0].team.id).toBe("t1");
  });
});

describe("sumScoresByTeam", () => {
  it("aggregates team score history", () => {
    const history: TeamScoreHistory[] = [
      { id: "th1", teamId: "t1", points: 5, actionName: "Win", createdAt: "2026-01-10T00:00:00.000Z" },
    ];
    expect(sumScoresByTeam(history).get("t1")).toBe(5);
  });
});

describe("getPodiumEntries", () => {
  it("includes all students through max rank", () => {
    const ranked = rankStudents([
      student("s1", "An", 10),
      student("s2", "Bình", 10),
      student("s3", "Chi", 5),
    ]);
    const podium = getPodiumEntries(ranked, 2);
    expect(podium.length).toBe(3);
  });
});

describe("groupRankedByRank", () => {
  it("groups entries by rank", () => {
    const ranked = rankStudents([student("s1", "An", 10), student("s2", "Bình", 10)]);
    const groups = groupRankedByRank(ranked, 1);
    expect(groups.get(1)?.length).toBe(2);
  });
});

describe("filterRankedStudents", () => {
  const ranked = rankStudents([
    student("s1", "An", 10, "t1", "female"),
    student("s2", "Bình", 5, undefined, "male"),
  ]);

  it("filters by search query", () => {
    expect(filterRankedStudents(ranked, { searchQuery: "an" }).length).toBe(1);
  });

  it("filters by team none", () => {
    expect(filterRankedStudents(ranked, { teamId: "none" }).length).toBe(1);
  });

  it("filters by gender", () => {
    expect(filterRankedStudents(ranked, { gender: "male" }).length).toBe(1);
  });
});

describe("rankTeams", () => {
  it("sorts teams by score", () => {
    const teams: Team[] = [
      { id: "t2", name: "B", score: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "t1", name: "A", score: 9, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];
    const ranked = rankTeams(teams);
    expect(ranked[0].team.id).toBe("t1");
  });

  it("keeps canonical ranks when filtering a subset", () => {
    const teams: Team[] = [
      { id: "t1", name: "Alpha", score: 30, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "t2", name: "Beta", score: 20, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "t3", name: "Gamma", score: 10, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];
    const rankById = new Map(rankTeams(teams).map((entry) => [entry.team.id, entry.rank]));
    const filtered = teams.filter((team) => team.id === "t1" || team.id === "t3");
    expect(filtered.map((team) => team.id)).toEqual(["t1", "t3"]);
    expect(rankById.get("t1")).toBe(1);
    expect(rankById.get("t3")).toBe(3);
  });
});
