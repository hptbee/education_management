import { describe, expect, it } from 'vitest'
import { getSegmentMidAngle, getWinnerRotation } from './wheelSpin'
import {
  DEFAULT_POINTS_WHEEL_SEGMENTS,
  getEnabledSegments,
  normalizePointsWheelConfig,
  validatePointsWheelConfig,
  validateSegmentValue,
} from './pointsWheelConfig'
import { formatPointsWheelLabel, pickWinningSegmentIndex } from './pointsWheelSpin'

describe('normalizePointsWheelConfig', () => {
  it('returns defaults when raw is missing', () => {
    const config = normalizePointsWheelConfig(undefined)
    expect(config).toHaveLength(5)
    expect(getEnabledSegments(config).map((s) => s.value)).toEqual([1, 2, 3, 5, 10])
  })

  it('migrates invalid entries and keeps valid ones', () => {
    const config = normalizePointsWheelConfig([
      { id: 'a', value: 7, enabled: true },
      { id: 'b', value: NaN, enabled: true },
    ])
    expect(config).toHaveLength(1)
    expect(config[0]?.value).toBe(7)
  })
})

describe('validatePointsWheelConfig', () => {
  it('accepts default config', () => {
    expect(validatePointsWheelConfig(DEFAULT_POINTS_WHEEL_SEGMENTS)).toBeNull()
  })

  it('rejects empty enabled set', () => {
    const config = DEFAULT_POINTS_WHEEL_SEGMENTS.map((s) => ({ ...s, enabled: false }))
    expect(validatePointsWheelConfig(config)).toMatch(/ít nhất một ô/)
  })

  it('rejects duplicate enabled values', () => {
    const config = [
      { id: 'a', value: 5, enabled: true },
      { id: 'b', value: 5, enabled: true },
    ]
    expect(validatePointsWheelConfig(config)).toMatch(/trùng/)
  })
})

describe('validateSegmentValue', () => {
  it('rejects non-integers', () => {
    expect(validateSegmentValue(1.5)).not.toBeNull()
  })

  it('accepts negative values in range', () => {
    expect(validateSegmentValue(-5)).toBeNull()
  })
})

describe('pickWinningSegmentIndex', () => {
  it('returns index within range', () => {
    const enabled = getEnabledSegments(DEFAULT_POINTS_WHEEL_SEGMENTS)
    for (let i = 0; i < 20; i++) {
      const index = pickWinningSegmentIndex(enabled)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(enabled.length)
    }
  })
})

describe('formatPointsWheelLabel', () => {
  it('formats positive and negative values', () => {
    expect(formatPointsWheelLabel(5)).toBe('+5')
    expect(formatPointsWheelLabel(-3)).toBe('-3')
    expect(formatPointsWheelLabel(0)).toBe('0')
  })
})

describe('wheel landing alignment', () => {
  it('rotation targets winner segment midpoint under pointer', () => {
    const enabled = getEnabledSegments(DEFAULT_POINTS_WHEEL_SEGMENTS)
    const winnerIndex = 2
    const segmentCount = enabled.length
    const currentRotation = 0
    const targetRotation = getWinnerRotation(currentRotation, winnerIndex, segmentCount, 12)
    const midAngle = getSegmentMidAngle(winnerIndex, segmentCount)
    const finalMod = ((targetRotation % 360) + 360) % 360
    const expectedMod = (360 - midAngle) % 360
    expect(Math.abs(finalMod - expectedMod)).toBeLessThan(0.001)
  })
})
