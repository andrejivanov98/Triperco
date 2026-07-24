import { describe, it, expect } from 'vitest'
import { enumerateDates, formatDayLabel, formatDateRange, nightsBetween } from './dates'

describe('dates', () => {
  it('enumerates an inclusive ISO date range', () => {
    expect(enumerateDates('2026-09-01', '2026-09-04')).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ])
  })

  it('returns [] for missing or unparseable input', () => {
    expect(enumerateDates(undefined, '2026-09-04')).toEqual([])
    expect(enumerateDates('September 1', '2026-09-04')).toEqual([])
    expect(enumerateDates('2026-09-04', '2026-09-01')).toEqual([]) // end before start
  })

  it('formats a weekday + month/day label deterministically', () => {
    expect(formatDayLabel('2026-09-01')).toBe('Tue, Sep 1')
    expect(formatDayLabel('2026-09-15')).toBe('Tue, Sep 15')
  })

  it('formats a compact date range', () => {
    expect(formatDateRange('2026-09-01', '2026-09-15')).toBe('Sep 1 – 15')
    expect(formatDateRange('2026-09-28', '2026-10-02')).toBe('Sep 28 – Oct 2')
  })

  it('counts nights between two ISO dates', () => {
    expect(nightsBetween('2026-09-01', '2026-09-15')).toBe(14)
    expect(nightsBetween('2026-09-01', '2026-09-01')).toBe(0)
    expect(nightsBetween('bad', '2026-09-15')).toBeUndefined()
  })
})
