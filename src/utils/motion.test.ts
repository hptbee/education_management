import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MOTION_DURATION_MS,
  MOTION_DURATION_S,
  canAnimate,
  filterBurstsForClassroom,
  prefersReducedMotion,
  staggerDelay,
} from './motion'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('motion', () => {
  it('exposes duration tokens in ms and seconds', () => {
    expect(MOTION_DURATION_MS.fast).toBe(120)
    expect(MOTION_DURATION_MS.normal).toBe(180)
    expect(MOTION_DURATION_MS.smooth).toBe(250)
    expect(MOTION_DURATION_MS.emphasis).toBe(350)
    expect(MOTION_DURATION_S.normal).toBe(0.18)
  })

  it('staggerDelay caps delay for large indices', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(2)).toBe(80)
    expect(staggerDelay(10)).toBe(160)
    expect(staggerDelay(100)).toBe(160)
  })

  it('canAnimate respects animationsEnabled when motion is allowed', () => {
    vi.stubGlobal('window', { matchMedia: vi.fn().mockReturnValue({ matches: false }) })
    expect(canAnimate(true)).toBe(true)
    expect(canAnimate(false)).toBe(false)
  })

  it('canAnimate is false when prefers-reduced-motion is set', () => {
    vi.stubGlobal('window', { matchMedia: vi.fn().mockReturnValue({ matches: true }) })
    expect(canAnimate(true)).toBe(false)
  })

  it('prefersReducedMotion reads matchMedia', () => {
    vi.stubGlobal('window', { matchMedia: vi.fn().mockReturnValue({ matches: true }) })
    expect(prefersReducedMotion()).toBe(true)
  })

  it('filterBurstsForClassroom drops bursts from other classrooms', () => {
    const bursts = [
      { id: 'a', classroomId: 'class-a' },
      { id: 'b', classroomId: 'class-b' },
    ]
    expect(filterBurstsForClassroom(bursts, 'class-a')).toEqual([{ id: 'a', classroomId: 'class-a' }])
    expect(filterBurstsForClassroom(bursts, undefined)).toEqual([])
  })
})
