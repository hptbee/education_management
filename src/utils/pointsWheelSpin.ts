import type { PointsWheelSegment } from '../types/models'

/** Equal probability among enabled segments; weight field reserved for future use. */
export function pickWinningSegmentIndex(segments: PointsWheelSegment[]): number {
  if (segments.length === 0) return 0
  return Math.floor(Math.random() * segments.length)
}

export function formatPointsWheelLabel(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

export function formatPointsWheelResult(value: number): string {
  const label = formatPointsWheelLabel(value)
  if (value > 0) return `${label} điểm`
  if (value < 0) return `${label} điểm`
  return '0 điểm'
}
