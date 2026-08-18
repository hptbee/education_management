import { describe, expect, it } from 'vitest'
import { resolvePublicAssetPath } from './sounds'

describe('resolvePublicAssetPath', () => {
  it('returns the path unchanged when window is unavailable', () => {
    expect(resolvePublicAssetPath('/sounds/click.wav')).toBe('/sounds/click.wav')
  })
})
