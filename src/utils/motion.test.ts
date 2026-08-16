import { afterEach, describe, expect, it, vi } from 'vitest'
import { canAnimate, prefersReducedMotion } from './motion'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('motion', () => {
  it('canAnimate respects animationsEnabled when motion is allowed', () => {
    vi.stubGlobal('window', { matchMedia: vi.fn().mockReturnValue({ matches: false }) })
    expect(canAnimate(true)).toBe(true)
    expect(canAnimate(false)).toBe(false)
  })

  it('prefersReducedMotion reads matchMedia', () => {
    vi.stubGlobal('window', { matchMedia: vi.fn().mockReturnValue({ matches: true }) })
    expect(prefersReducedMotion()).toBe(true)
  })
})
