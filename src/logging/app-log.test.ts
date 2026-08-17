import { describe, expect, it } from 'vitest'
import { sanitizeLogField } from './app-log'

describe('sanitizeLogField', () => {
  it('collapses newlines and trims', () => {
    expect(sanitizeLogField('  hello\nworld  ')).toBe('hello world')
  })

  it('truncates long values', () => {
    const long = 'a'.repeat(10)
    expect(sanitizeLogField(long, 5)).toBe('aaaaa…')
  })
})
