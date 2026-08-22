import { describe, expect, it } from "vitest";
import {
  assignDuckRaceFieldYs,
  clampDuckRaceParticipants,
  clampDuckRaceDurationMs,
  clampDuckRaceDurationSec,
  DUCK_RACE_MAX_RACERS,
  DUCK_RACE_OTHERS_MAX_AT_FINISH,
  duckRaceLabelMode,
  duckRaceVisualTier,
  generateRacePlan,
  hasWinnerReachedFinish,
  sampleRaceFinishFrame,
  sampleRaceProgress,
  sampleRacerProgress,
  shortDuckRaceLabel,
} from "./duckRaceSimulation";

describe("duckRaceSimulation", () => {
  it("clamps participants to the max racer count", () => {
    const participants = Array.from({ length: DUCK_RACE_MAX_RACERS + 1 }, (_, i) => ({
      id: `s${i}`,
    }));
    const { racers, truncated } = clampDuckRaceParticipants(participants);
    expect(truncated).toBe(true);
    expect(racers).toHaveLength(DUCK_RACE_MAX_RACERS);
  });

  it("does not truncate when at or under the max", () => {
    const participants = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}` }));
    const { racers, truncated } = clampDuckRaceParticipants(participants);
    expect(truncated).toBe(false);
    expect(racers).toHaveLength(50);
  });

  it("requires the winner to be a participant", () => {
    expect(() =>
      generateRacePlan({ racerIds: ["a", "b"], winnerId: "c", seed: 1 }),
    ).toThrow(/Winner must be/);
  });

  it("makes the winner finish first for every sample after mid-race", () => {
    const plan = generateRacePlan({
      racerIds: ["a", "b", "c", "d"],
      winnerId: "b",
      durationMs: 10_000,
      seed: 42,
    });

    const winnerProfile = plan.profiles.find((p) => p.studentId === "b")!;
    for (const profile of plan.profiles) {
      if (profile.studentId === "b") continue;
      expect(profile.finishMs).toBeGreaterThan(winnerProfile.finishMs);
    }

    const atWinnerFinish = sampleRaceProgress(plan, winnerProfile.finishMs);
    expect(atWinnerFinish.b).toBe(1);
    expect(atWinnerFinish.a).toBeLessThan(1);
    expect(atWinnerFinish.c).toBeLessThan(1);
    expect(atWinnerFinish.d).toBeLessThan(1);
  });

  it.each([1, 12, 13, 30, 50, 100] as const)(
    "keeps winner finishing first with %s racers",
    (count) => {
      const racerIds = Array.from({ length: count }, (_, i) => `r${i}`);
      const winnerId = racerIds[Math.floor(count / 2)]!;
      const plan = generateRacePlan({
        racerIds,
        winnerId,
        durationMs: 10_000,
        seed: 1000 + count,
      });
      const winnerProfile = plan.profiles.find((p) => p.studentId === winnerId)!;
      for (const profile of plan.profiles) {
        if (profile.studentId === winnerId) continue;
        expect(profile.finishMs).toBeGreaterThan(winnerProfile.finishMs);
      }
      const progress = sampleRaceProgress(plan, winnerProfile.finishMs);
      expect(progress[winnerId]).toBe(1);
      for (const id of racerIds) {
        if (id === winnerId) continue;
        expect(progress[id]).toBeLessThan(1);
      }
    },
  );

  it("keeps progress monotonic for each racer", () => {
    const plan = generateRacePlan({
      racerIds: ["a", "b", "c"],
      winnerId: "a",
      durationMs: 9_000,
      seed: 7,
    });

    for (const profile of plan.profiles) {
      let previous = 0;
      for (let t = 0; t <= profile.finishMs; t += 250) {
        const next = sampleRacerProgress(profile, t);
        expect(next).toBeGreaterThanOrEqual(previous - 0.02);
        previous = Math.max(previous, next);
      }
      expect(sampleRacerProgress(profile, profile.finishMs)).toBe(1);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateRacePlan({
      racerIds: ["x", "y", "z"],
      winnerId: "y",
      durationMs: 11_000,
      seed: 99,
    });
    const b = generateRacePlan({
      racerIds: ["x", "y", "z"],
      winnerId: "y",
      durationMs: 11_000,
      seed: 99,
    });
    expect(a).toEqual(b);
    expect(sampleRaceProgress(a, 4_000)).toEqual(sampleRaceProgress(b, 4_000));
  });

  it("assigns stable field Y positions for the same seed", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `s${i}`);
    const a = assignDuckRaceFieldYs(ids, 55);
    const b = assignDuckRaceFieldYs(ids, 55);
    expect(a).toEqual(b);
    for (const id of ids) {
      expect(a[id]).toBeGreaterThanOrEqual(0);
      expect(a[id]).toBeLessThanOrEqual(1);
    }
  });

  it("assigns different field Y positions for different layout seeds", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `s${i}`);
    const a = assignDuckRaceFieldYs(ids, 11);
    const b = assignDuckRaceFieldYs(ids, 99);
    expect(a).not.toEqual(b);
  });

  it("avoids exact duplicate Y positions for typical counts", () => {
    for (const count of [12, 30, 50, 100]) {
      const ids = Array.from({ length: count }, (_, i) => `s${i}`);
      const ys = Object.values(assignDuckRaceFieldYs(ids, 77));
      expect(new Set(ys.map((y) => y.toFixed(5))).size).toBe(count);
    }
  });

  it("maps visual tiers and label modes by count", () => {
    expect(duckRaceVisualTier(1)).toBe("large");
    expect(duckRaceVisualTier(12)).toBe("large");
    expect(duckRaceVisualTier(13)).toBe("medium");
    expect(duckRaceVisualTier(30)).toBe("medium");
    expect(duckRaceVisualTier(31)).toBe("small");
    expect(duckRaceVisualTier(60)).toBe("small");
    expect(duckRaceVisualTier(61)).toBe("compact");
    expect(duckRaceVisualTier(100)).toBe("compact");

    expect(duckRaceLabelMode(12)).toBe("full");
    expect(duckRaceLabelMode(13)).toBe("short");
    expect(duckRaceLabelMode(30)).toBe("short");
    expect(duckRaceLabelMode(31)).toBe("none");
  });

  it("shortens labels to the last two words", () => {
    expect(shortDuckRaceLabel("Minh")).toBe("Minh");
    expect(shortDuckRaceLabel("Nguyễn Văn A")).toBe("Văn A");
    expect(shortDuckRaceLabel("Trần Thị Thu Hà")).toBe("Thu Hà");
  });

  it.each([1, 12, 50, 100] as const)(
    "finish frame stops with winner at 1 and others below finish for %s racers",
    (count) => {
      const racerIds = Array.from({ length: count }, (_, i) => `r${i}`);
      const winnerId = racerIds[0]!;
      const plan = generateRacePlan({
        racerIds,
        winnerId,
        durationMs: 10_000,
        seed: 2000 + count,
      });
      const winnerFinish = plan.profiles.find((p) => p.studentId === winnerId)!.finishMs;

      expect(hasWinnerReachedFinish(plan, winnerFinish - 1)).toBe(false);
      expect(hasWinnerReachedFinish(plan, winnerFinish)).toBe(true);

      const finishFrame = sampleRaceFinishFrame(plan, winnerFinish);
      expect(finishFrame[winnerId]).toBe(1);
      for (const id of racerIds) {
        if (id === winnerId) continue;
        expect(finishFrame[id]).toBeLessThan(1);
        expect(finishFrame[id]).toBeLessThanOrEqual(DUCK_RACE_OTHERS_MAX_AT_FINISH);
      }

      // Freeze: sampling later times for display still uses finish-frame clamp, not continued race.
      const laterRaw = sampleRaceProgress(plan, winnerFinish + 2_000);
      const frozen = sampleRaceFinishFrame(plan, winnerFinish);
      expect(frozen[winnerId]).toBe(1);
      for (const id of racerIds) {
        if (id === winnerId) continue;
        // Frozen frame must not advance past finish-frame clamp even if raw later would.
        expect(frozen[id]!).toBeLessThanOrEqual(DUCK_RACE_OTHERS_MAX_AT_FINISH);
        if ((laterRaw[id] ?? 0) > DUCK_RACE_OTHERS_MAX_AT_FINISH) {
          expect(frozen[id]!).toBeLessThan(laterRaw[id]!);
        }
      }
    },
  );

  it("never lets a non-winner reach finish before the planned winner", () => {
    const plan = generateRacePlan({
      racerIds: Array.from({ length: 40 }, (_, i) => `s${i}`),
      winnerId: "s7",
      durationMs: 11_000,
      seed: 333,
    });
    const winnerFinish = plan.profiles.find((p) => p.studentId === "s7")!.finishMs;
    for (let t = 0; t <= winnerFinish; t += 100) {
      const progress = sampleRaceProgress(plan, t);
      if (t < winnerFinish) {
        expect(progress.s7).toBeLessThan(1);
      }
      for (const profile of plan.profiles) {
        if (profile.studentId === "s7") continue;
        expect(progress[profile.studentId]!).toBeLessThan(1);
      }
    }
    const finish = sampleRaceFinishFrame(plan, winnerFinish);
    expect(finish.s7).toBe(1);
    for (const profile of plan.profiles) {
      if (profile.studentId === "s7") continue;
      expect(finish[profile.studentId]!).toBeLessThan(1);
    }
  });

  it("clamps teacher duration to allowed range", () => {
    expect(clampDuckRaceDurationMs(3_000)).toBe(5_000);
    expect(clampDuckRaceDurationMs(10_000)).toBe(10_000);
    expect(clampDuckRaceDurationMs(60_000)).toBe(30_000);
    expect(clampDuckRaceDurationSec(10)).toBe(10);
  });
});
