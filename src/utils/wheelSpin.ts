const DEG_PER_TURN = 360

const MIN_DURATION_SEC = 6.5
const MAX_DURATION_SEC = 12
const MIN_TURNS = 8
const MAX_TURNS = 16

const EASE_OPTIONS: Array<[number, number, number, number]> = [
  [0.08, 0.82, 0, 1],
  [0.12, 0.72, 0.02, 1],
  [0.18, 0.58, 0.08, 1],
  [0.05, 0.88, 0, 1],
]

export interface WheelSpinPlan {
  durationSec: number
  durationMs: number
  extraTurns: number
  ease: [number, number, number, number]
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number) {
  return Math.floor(randomInRange(min, max + 1))
}

/** Random duration, extra turns, and slowdown curve so each spin feels different. */
export function createRandomSpinPlan(): WheelSpinPlan {
  const durationSec = Number(randomInRange(MIN_DURATION_SEC, MAX_DURATION_SEC).toFixed(2))
  return {
    durationSec,
    durationMs: Math.round(durationSec * 1000),
    extraTurns: randomInt(MIN_TURNS, MAX_TURNS),
    ease: EASE_OPTIONS[randomInt(0, EASE_OPTIONS.length - 1)],
  }
}

/** Mid-angle of segment index (degrees clockwise from 3 o'clock). */
export function getSegmentMidAngle(winnerIndex: number, segmentCount: number): number {
  if (segmentCount <= 0) return 0
  return (winnerIndex + 0.5) * (DEG_PER_TURN / segmentCount)
}

/**
 * Compute next cumulative rotation so the winner segment midpoint stops under the
 * fixed pointer at 3 o'clock (0°).
 */
export function getWinnerRotation(
  currentRotationDeg: number,
  winnerIndex: number,
  segmentCount: number,
  extraTurns = 12,
): number {
  if (segmentCount <= 0) return currentRotationDeg

  const midAngle = getSegmentMidAngle(winnerIndex, segmentCount)
  const targetMod = (DEG_PER_TURN - midAngle) % DEG_PER_TURN
  const currentMod = ((currentRotationDeg % DEG_PER_TURN) + DEG_PER_TURN) % DEG_PER_TURN
  const alignDelta = (targetMod - currentMod + DEG_PER_TURN) % DEG_PER_TURN

  return currentRotationDeg + extraTurns * DEG_PER_TURN + alignDelta
}

export function getWheelDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(' ')
  return parts.slice(-2).join(' ')
}
