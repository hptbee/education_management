import { afterEach, describe, expect, it } from 'vitest'
import {
  clearTrapStackForTests,
  isTopTrap,
  pushTrapStack,
  removeTrapStack,
} from './modalTrapStack'

describe('modalTrapStack', () => {
  afterEach(() => {
    clearTrapStackForTests()
  })

  it('marks only the latest trap as top', () => {
    const first = pushTrapStack()
    const second = pushTrapStack()

    expect(isTopTrap(first)).toBe(false)
    expect(isTopTrap(second)).toBe(true)
  })

  it('removes traps by id without popping unrelated entries', () => {
    const first = pushTrapStack()
    const second = pushTrapStack()

    removeTrapStack(first)

    expect(isTopTrap(second)).toBe(true)
    expect(isTopTrap(first)).toBe(false)
  })

  it('updates top after the current top is removed', () => {
    const first = pushTrapStack()
    const second = pushTrapStack()

    removeTrapStack(second)

    expect(isTopTrap(first)).toBe(true)
    expect(isTopTrap(second)).toBe(false)
  })

  it('re-pushing a parent after a child opens makes the parent top (trap hook must not re-push on callback change)', () => {
    const parent = pushTrapStack()
    const child = pushTrapStack()

    removeTrapStack(parent)
    const parentAgain = pushTrapStack()

    expect(isTopTrap(child)).toBe(false)
    expect(isTopTrap(parentAgain)).toBe(true)
  })
})
