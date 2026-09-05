export const DUCK_RACE_MAX_RACERS = 100;
/** Random default band when no teacher duration is provided. */
export const DUCK_RACE_MIN_DURATION_MS = 8_000;
export const DUCK_RACE_MAX_DURATION_MS = 12_000;
/** Teacher-configurable race length (seconds). */
export const DUCK_RACE_DURATION_PRESETS_SEC = [5, 8, 10, 15, 20, 30] as const;
export const DUCK_RACE_DEFAULT_DURATION_SEC = 10;
export const DUCK_RACE_TEACHER_MIN_DURATION_MS = 5_000;
export const DUCK_RACE_TEACHER_MAX_DURATION_MS = 30_000;

export type DuckRaceVisualTier = "large" | "medium" | "small" | "compact";
export type DuckRaceLabelMode = "full" | "short" | "compact";

export interface DuckRaceRacerProfile {
  studentId: string;
  /** Time (ms) when this racer reaches the finish line. */
  finishMs: number;
  /** Mid-race lead bias: higher = faster early stretch. */
  surge: number;
  /** Late catch-up strength. */
  lateKick: number;
}

export interface DuckRacePlan {
  winnerId: string;
  winnerIds: string[];
  racerIds: string[];
  durationMs: number;
  seed: number;
  profiles: DuckRaceRacerProfile[];
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickDuckRaceDurationMs(random: () => number = Math.random): number {
  return Math.round(
    DUCK_RACE_MIN_DURATION_MS +
      random() * (DUCK_RACE_MAX_DURATION_MS - DUCK_RACE_MIN_DURATION_MS),
  );
}

export function clampDuckRaceDurationMs(ms: number): number {
  return Math.round(
    Math.min(DUCK_RACE_TEACHER_MAX_DURATION_MS, Math.max(DUCK_RACE_TEACHER_MIN_DURATION_MS, ms)),
  );
}

export function clampDuckRaceDurationSec(sec: number): number {
  return Math.round(
    clampDuckRaceDurationMs(sec * 1000) / 1000,
  );
}

export function clampDuckRaceParticipants<T extends { id: string }>(
  participants: T[],
  max = DUCK_RACE_MAX_RACERS,
): { racers: T[]; truncated: boolean } {
  if (participants.length <= max) {
    return { racers: participants, truncated: false };
  }
  return { racers: participants.slice(0, max), truncated: true };
}

export function duckRaceVisualTier(count: number): DuckRaceVisualTier {
  if (count <= 12) return "large";
  if (count <= 30) return "medium";
  if (count <= 60) return "small";
  return "compact";
}

export function duckRaceLabelMode(count: number): DuckRaceLabelMode {
  if (count <= 12) return "full";
  if (count <= 30) return "short";
  return "compact";
}

export function shortDuckRaceLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length <= 2) return parts.join(" ");
  return parts.slice(-2).join(" ");
}

/** Shortest readable label for crowded fields (31+ ducks). */
export function compactDuckRaceLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    const word = parts[0]!;
    return word.length <= 10 ? word : word.slice(0, 9) + "…";
  }
  const last = parts[parts.length - 1]!;
  if (last.length <= 10) return last;
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function duckRaceDisplayLabel(name: string, mode: DuckRaceLabelMode): string {
  if (mode === "compact") return compactDuckRaceLabel(name);
  return shortDuckRaceLabel(name);
}

/**
 * Deterministic vertical positions (0..1) for a shared race field.
 * Pass a fresh random seed each race round for new layouts; stable within one race.
 */
export function assignDuckRaceFieldYs(
  racerIds: string[],
  seed: number,
): Record<string, number> {
  const random = mulberry32(seed >>> 0);
  const ids = [...racerIds];
  const n = ids.length;
  if (n === 0) return {};

  // Shuffle slot order so the same roster gets a different vertical spread each round.
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = ids[i]!;
    ids[i] = ids[j]!;
    ids[j] = tmp;
  }

  const result: Record<string, number> = {};

  if (n === 1) {
    result[ids[0]!] = 0.5;
    return result;
  }

  // Even base spacing with slight jitter so ducks cluster without stacking.
  const minGap = Math.min(0.08, 0.92 / Math.max(n - 1, 1));
  const slots = ids
    .map((id, index) => {
      const base = index / (n - 1);
      const jitter = (random() - 0.5) * minGap * 0.85;
      const hashBias = ((hashString(`${seed}:${id}`) % 1000) / 1000 - 0.5) * minGap * 0.4;
      return { id, y: clamp01(base + jitter + hashBias) };
    })
    .sort((a, b) => a.y - b.y);

  // Soft-enforce minimum separation after sort.
  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1]!;
    const curr = slots[i]!;
    if (curr.y - prev.y < minGap * 0.55) {
      curr.y = Math.min(1, prev.y + minGap * 0.55);
    }
  }
  // Re-normalize if we pushed past 1.
  const last = slots[slots.length - 1]!;
  if (last.y > 1) {
    const scale = 1 / last.y;
    for (const slot of slots) slot.y *= scale;
  }

  for (const slot of slots) {
    result[slot.id] = clamp01(slot.y);
  }
  return result;
}

/**
 * Build a race plan where `winnerId` always reaches progress 1.0 first.
 * Mid-race progress can vary so leads change visually.
 */
export function generateRacePlan(input: {
  racerIds: string[];
  winnerId: string;
  durationMs?: number;
  seed?: number;
}): DuckRacePlan {
  const uniqueIds = [...new Set(input.racerIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new Error("Duck race requires at least one participant");
  }
  if (!uniqueIds.includes(input.winnerId)) {
    throw new Error("Winner must be one of the race participants");
  }

  const seed =
    input.seed ??
    (hashString(`${input.winnerId}:${uniqueIds.join(",")}:${input.durationMs ?? ""}`) ^
      Math.floor(Math.random() * 0xffffffff));
  const random = mulberry32(seed);
  const durationMs = input.durationMs ?? pickDuckRaceDurationMs(random);

  const winnerFinish = durationMs * (0.72 + random() * 0.08);
  const profiles: DuckRaceRacerProfile[] = uniqueIds.map((studentId, index) => {
    if (studentId === input.winnerId) {
      return {
        studentId,
        finishMs: winnerFinish,
        surge: 0.35 + random() * 0.35,
        lateKick: 0.55 + random() * 0.35,
      };
    }

    const lag = 0.06 + random() * 0.22 + index * 0.01;
    return {
      studentId,
      finishMs: Math.min(durationMs, winnerFinish * (1 + lag)),
      surge: 0.2 + random() * 0.7,
      lateKick: 0.25 + random() * 0.55,
    };
  });

  return {
    winnerId: input.winnerId,
    winnerIds: [input.winnerId],
    racerIds: uniqueIds,
    durationMs,
    seed,
    profiles,
  };
}

/**
 * Smooth ease that starts near linear, dips/surges mid-race, then finishes at finishMs.
 */
export function sampleRacerProgress(profile: DuckRaceRacerProfile, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= profile.finishMs) return 1;

  const t = elapsedMs / profile.finishMs;
  const easeIn = t * t;
  const easeOut = 1 - (1 - t) * (1 - t);
  const blended = easeIn * (1 - profile.surge) + easeOut * profile.surge;
  const pulse = Math.sin(t * Math.PI * (1.2 + profile.lateKick)) * 0.04 * t * (1 - t);
  const late = Math.pow(t, 1.15 - profile.lateKick * 0.35);

  return clamp01(blended * 0.75 + late * 0.25 + pulse);
}

export function sampleRaceProgress(
  plan: DuckRacePlan,
  elapsedMs: number,
): Record<string, number> {
  const progress: Record<string, number> = {};
  for (const profile of plan.profiles) {
    progress[profile.studentId] = sampleRacerProgress(profile, elapsedMs);
  }
  return progress;
}

/** Max progress for non-winners on the finish frame (must stay visually before the line). */
export const DUCK_RACE_FINISH_THRESHOLD = 1;
export const DUCK_RACE_OTHERS_MAX_AT_FINISH = 0.985;

/**
 * Progress snapshot for the exact frame the deterministic winner reaches the finish.
 * Winner is clamped to 1; every other racer stays strictly below the finish line.
 */
export function sampleRaceFinishFrame(
  plan: DuckRacePlan,
  elapsedMs: number,
): Record<string, number> {
  const progress = sampleRaceProgress(plan, elapsedMs);
  progress[plan.winnerId] = DUCK_RACE_FINISH_THRESHOLD;
  for (const id of plan.racerIds) {
    if (id === plan.winnerId) continue;
    const value = progress[id] ?? 0;
    progress[id] = Math.min(value, DUCK_RACE_OTHERS_MAX_AT_FINISH);
  }
  return progress;
}

/** True when the planned winner has reached the finish threshold at this elapsed time. */
export function hasWinnerReachedFinish(plan: DuckRacePlan, elapsedMs: number): boolean {
  const winnerProfile = plan.profiles.find((p) => p.studentId === plan.winnerId);
  if (!winnerProfile) return false;
  return sampleRacerProgress(winnerProfile, elapsedMs) >= DUCK_RACE_FINISH_THRESHOLD;
}

export function getLeadingRacerId(plan: DuckRacePlan, elapsedMs: number): string {
  let bestId = plan.winnerId;
  let bestProgress = -1;
  for (const profile of plan.profiles) {
    const progress = sampleRacerProgress(profile, elapsedMs);
    if (progress > bestProgress) {
      bestProgress = progress;
      bestId = profile.studentId;
    }
  }
  return bestId;
}
