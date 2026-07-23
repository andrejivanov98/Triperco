import { describe, it, expect } from 'vitest'
import { formatMoney } from './format'

describe('formatMoney', () => {
  it('formats whole USD amounts with no decimals', () => {
    expect(formatMoney(1140)).toBe('$1,140')
  })

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('$0')
  })
})
