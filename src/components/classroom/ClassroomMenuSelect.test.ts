import { describe, expect, it } from 'vitest'
import { highlightIndexForValue, moveMenuHighlight } from './ClassroomMenuSelect'

describe('ClassroomMenuSelect keyboard helpers', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ]

  it('highlightIndexForValue returns the matching option index', () => {
    expect(highlightIndexForValue(options, 'b')).toBe(1)
  })

  it('highlightIndexForValue falls back to zero when value is missing', () => {
    expect(highlightIndexForValue(options, 'missing')).toBe(0)
  })

  it('moveMenuHighlight wraps around the option list', () => {
    expect(moveMenuHighlight(2, 1, 3)).toBe(0)
    expect(moveMenuHighlight(0, -1, 3)).toBe(2)
  })
})
