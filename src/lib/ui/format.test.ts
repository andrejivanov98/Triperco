import { describe, it, expect } from 'vitest'
import { formatMoney, formatDuration, formatStops, formatRating, formatCarbon } from './format'

describe('formatMoney', () => {
  it('formats whole USD amounts with no decimals', () => {
    expect(formatMoney(1140)).toBe('$1,140')
  })

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('$0')
  })
})

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(315)).toBe('5h 15m')
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(120)).toBe('2h')
  })

  it('returns undefined when unknown', () => {
    expect(formatDuration(undefined)).toBeUndefined()
  })
})

describe('formatStops', () => {
  it('labels a nonstop flight', () => {
    expect(formatStops(0)).toBe('Nonstop')
  })

  it('names the connection airports', () => {
    expect(formatStops(1, ['MUC'])).toBe('1 stop · MUC')
    expect(formatStops(2, ['MUC', 'VIE'])).toBe('2 stops · MUC, VIE')
  })

  it('falls back to the count when codes are missing', () => {
    expect(formatStops(1, [undefined])).toBe('1 stop')
  })
})

describe('formatRating', () => {
  it('combines stars and review count', () => {
    expect(formatRating(4.6, 1204)).toBe('4.6 ★ · 1,204 reviews')
    expect(formatRating(4.6)).toBe('4.6 ★')
    expect(formatRating(undefined, 10)).toBeUndefined()
  })
})

describe('formatCarbon', () => {
  it('converts grams to kilograms', () => {
    expect(formatCarbon(184000)).toBe('184 kg CO₂e')
    expect(formatCarbon(undefined)).toBeUndefined()
  })
})
