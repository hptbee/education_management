import { describe, expect, it } from 'vitest'
import {
  DUCK_RACE_DOUBLE_QUACK_GAP_MAX_MS,
  DUCK_RACE_DOUBLE_QUACK_GAP_MIN_MS,
  DUCK_RACE_QUACK_MAX_MS,
  DUCK_RACE_QUACK_MIN_MS,
  nextDuckRaceDoubleQuackGapMs,
  nextDuckRaceQuackDelayMs,
  resolvePublicAssetPath,
  shouldPlayDuckRaceDoubleQuack,
  startDuckRaceQuacks,
} from './sounds'

describe('resolvePublicAssetPath', () => {
  it('returns the path unchanged when window is unavailable', () => {
    expect(resolvePublicAssetPath('/sounds/click.wav')).toBe('/sounds/click.wav')
  })
})

describe('nextDuckRaceQuackDelayMs', () => {
  it('stays within the ambient quack window', () => {
    expect(nextDuckRaceQuackDelayMs(() => 0)).toBe(DUCK_RACE_QUACK_MIN_MS)
    expect(nextDuckRaceQuackDelayMs(() => 1)).toBe(DUCK_RACE_QUACK_MAX_MS)
    expect(nextDuckRaceQuackDelayMs(() => 0.5)).toBe(
      DUCK_RACE_QUACK_MIN_MS + 0.5 * (DUCK_RACE_QUACK_MAX_MS - DUCK_RACE_QUACK_MIN_MS),
    )
  })
})

describe('nextDuckRaceDoubleQuackGapMs', () => {
  it('stays within the double-quack gap window', () => {
    expect(nextDuckRaceDoubleQuackGapMs(() => 0)).toBe(DUCK_RACE_DOUBLE_QUACK_GAP_MIN_MS)
    expect(nextDuckRaceDoubleQuackGapMs(() => 1)).toBe(DUCK_RACE_DOUBLE_QUACK_GAP_MAX_MS)
  })
})

describe('shouldPlayDuckRaceDoubleQuack', () => {
  it('follows the configured chance threshold', () => {
    expect(shouldPlayDuckRaceDoubleQuack(() => 0)).toBe(true)
    expect(shouldPlayDuckRaceDoubleQuack(() => 0.99)).toBe(false)
  })
})

describe('startDuckRaceQuacks', () => {
  it('returns a no-op stopper when disabled', () => {
    const stop = startDuckRaceQuacks(false)
    expect(() => stop()).not.toThrow()
  })
})
