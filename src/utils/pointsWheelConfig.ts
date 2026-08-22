import type { PointsWheelSegment } from '../types/models'
import { createId } from './id'

export const POINTS_WHEEL_MAX_SEGMENTS = 12
export const POINTS_WHEEL_MIN_VALUE = -100
export const POINTS_WHEEL_MAX_VALUE = 100

export const DEFAULT_POINTS_WHEEL_SEGMENTS: PointsWheelSegment[] = [
  { id: 'pws-seg-1', value: 1, enabled: true },
  { id: 'pws-seg-2', value: 2, enabled: true },
  { id: 'pws-seg-3', value: 3, enabled: true },
  { id: 'pws-seg-4', value: 5, enabled: true },
  { id: 'pws-seg-5', value: 10, enabled: true },
]

function isValidSegmentValue(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (!Number.isInteger(value)) return false
  return value >= POINTS_WHEEL_MIN_VALUE && value <= POINTS_WHEEL_MAX_VALUE
}

function sanitizeSegment(raw: unknown): PointsWheelSegment | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.id !== 'string' || !record.id) return null
  if (!isValidSegmentValue(record.value)) return null
  return {
    id: record.id,
    value: record.value,
    enabled: record.enabled !== false,
    weight:
      typeof record.weight === 'number' && Number.isFinite(record.weight) && record.weight > 0
        ? record.weight
        : undefined,
  }
}

export function normalizePointsWheelConfig(raw: unknown): PointsWheelSegment[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_POINTS_WHEEL_SEGMENTS.map((segment) => ({ ...segment }))
  }

  const segments = raw
    .map(sanitizeSegment)
    .filter((segment): segment is PointsWheelSegment => segment !== null)
    .slice(0, POINTS_WHEEL_MAX_SEGMENTS)

  if (segments.length === 0) {
    return DEFAULT_POINTS_WHEEL_SEGMENTS.map((segment) => ({ ...segment }))
  }

  return segments
}

export function getEnabledSegments(config: PointsWheelSegment[]): PointsWheelSegment[] {
  return config.filter((segment) => segment.enabled)
}

export function validateSegmentValue(value: number): string | null {
  if (!isValidSegmentValue(value)) {
    return `Điểm phải là số nguyên từ ${POINTS_WHEEL_MIN_VALUE} đến ${POINTS_WHEEL_MAX_VALUE}.`
  }
  return null
}

export function validatePointsWheelConfig(config: PointsWheelSegment[]): string | null {
  if (config.length === 0) {
    return 'Cần ít nhất một ô điểm.'
  }
  if (config.length > POINTS_WHEEL_MAX_SEGMENTS) {
    return `Tối đa ${POINTS_WHEEL_MAX_SEGMENTS} ô điểm.`
  }

  const enabled = getEnabledSegments(config)
  if (enabled.length === 0) {
    return 'Cần ít nhất một ô điểm đang bật.'
  }

  const enabledValues = new Set<number>()
  for (const segment of config) {
    const valueError = validateSegmentValue(segment.value)
    if (valueError) return valueError
    if (segment.enabled) {
      if (enabledValues.has(segment.value)) {
        return `Giá trị ${segment.value > 0 ? `+${segment.value}` : segment.value} bị trùng.`
      }
      enabledValues.add(segment.value)
    }
  }

  return null
}

export function createPointsWheelSegment(value: number): PointsWheelSegment {
  return {
    id: createId('pws'),
    value,
    enabled: true,
  }
}
