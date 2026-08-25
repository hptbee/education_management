import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MOTION_DURATION_MS,
  MOTION_DURATION_S,
  PAGE_TRANSITION_PRESETS,
  canAnimate,
  filterBurstsForClassroom,
  pointBurstLifetimeMs,
  POINT_BURST_HOLD_MS,
  ENTRANCE_PRESETS,
  MAX_ENTRANCE_ANIMATED_ITEMS,
  pickEntrancePreset,
  pickPageTransition,
  prefersReducedMotion,
  resolveEntrancePreset,
  resolvePageTransition,
  shouldAnimateEntranceItem,
  staggerDelay,
} from './motion'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('motion', () => {
  it('exposes duration tokens in ms and seconds', () => {
    expect(MOTION_DURATION_MS.fast).toBe(200)
    expect(MOTION_DURATION_MS.normal).toBe(300)
    expect(MOTION_DURATION_MS.smooth).toBe(420)
    expect(MOTION_DURATION_MS.entrance).toBe(520)
    expect(MOTION_DURATION_MS.emphasis).toBe(580)
    expect(MOTION_DURATION_MS.page).toBe(520)
    expect(MOTION_DURATION_S.normal).toBe(0.3)
    expect(MOTION_DURATION_S.page).toBe(0.52)
    expect(MOTION_DURATION_S.entrance).toBe(0.52)
  })

  it('staggerDelay caps delay for large indices', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(2)).toBe(180)
    expect(staggerDelay(10)).toBe(260)
    expect(staggerDelay(100)).toBe(260)
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

  it('pointBurstLifetimeMs covers emphasis animation plus hold', () => {
    expect(POINT_BURST_HOLD_MS).toBe(MOTION_DURATION_MS.fast)
    expect(pointBurstLifetimeMs()).toBe(MOTION_DURATION_MS.emphasis + MOTION_DURATION_MS.fast)
  })

  it('pickEntrancePreset returns one of the approved presets', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(ENTRANCE_PRESETS).toContain(pickEntrancePreset(() => i / 20))
    }
  })

  it('resolveEntrancePreset keeps explicit variants deterministic', () => {
    expect(resolveEntrancePreset('fadeUp', null)).toBe('fadeUp')
    expect(resolveEntrancePreset('fadeScale', 'fade')).toBe('fadeScale')
  })

  it('resolveEntrancePreset reuses stored random preset', () => {
    expect(resolveEntrancePreset('random', 'fadeUp', () => 0)).toBe('fadeUp')
    expect(resolveEntrancePreset('random', null, () => 0)).toBe('fade')
  })

  it('shouldAnimateEntranceItem caps animated list items', () => {
    expect(shouldAnimateEntranceItem()).toBe(true)
    expect(shouldAnimateEntranceItem(0)).toBe(true)
    expect(shouldAnimateEntranceItem(MAX_ENTRANCE_ANIMATED_ITEMS - 1)).toBe(true)
    expect(shouldAnimateEntranceItem(MAX_ENTRANCE_ANIMATED_ITEMS)).toBe(false)
    expect(shouldAnimateEntranceItem(100)).toBe(false)
  })

  it('pickPageTransition returns one of the approved presets', () => {
    for (let i = 0; i < 20; i += 1) {
      const pick = pickPageTransition('/students', () => i / 20)
      expect(PAGE_TRANSITION_PRESETS).toContain(pick.preset)
      expect(pick.path).toBe('/students')
      expect([1, -1]).toContain(pick.slideDir)
    }
  })

  it('resolvePageTransition reuses stored pick for the same path', () => {
    const stored = pickPageTransition('/teams', () => 0.9)
    expect(resolvePageTransition('/teams', stored, () => 0)).toEqual(stored)
  })

  it('resolvePageTransition picks again when the path changes', () => {
    const stored = pickPageTransition('/teams', () => 0.9)
    const next = resolvePageTransition('/rewards', stored, () => 0)
    expect(next.path).toBe('/rewards')
    expect(next.preset).toBe('sparkleReveal')
  })

  it('pickPageTransition prefers the route personality when rng hits the preferred bucket', () => {
    expect(pickPageTransition('/rewards', () => 0).preset).toBe('sparkleReveal')
    expect(pickPageTransition('/classrooms', () => 0).preset).toBe('bubbleReveal')
    expect(pickPageTransition('/students', () => 0).preset).toBe('bouncyPop')
  })
})
