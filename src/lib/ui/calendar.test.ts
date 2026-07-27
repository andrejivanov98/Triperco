import { describe, it, expect } from 'vitest'
import {
  monthGrid,
  monthLabel,
  addMonths,
  selectDate,
  isInRange,
  isEdge,
  describeRange,
  toIso,
  WEEKDAY_LABELS,
} from './calendar'

describe('monthGrid', () => {
  it('pads leading blanks so the first day lands on its weekday', () => {
    // 1 Sep 2026 is a Tuesday → one blank before it in a Monday-first grid.
    const cells = monthGrid(2026, 8)
    expect(cells[0]).toBeNull()
    expect(cells[1]).toEqual({ iso: '2026-09-01', day: 1 })
  })

  it('covers every day of the month', () => {
    expect(monthGrid(2026, 8).filter(Boolean)).toHaveLength(30) // September
    expect(monthGrid(2026, 1).filter(Boolean)).toHaveLength(28) // February 2026
    expect(monthGrid(2028, 1).filter(Boolean)).toHaveLength(29) // leap year
  })

  it('starts the week on Monday', () => {
    expect(WEEKDAY_LABELS[0]).toBe('Mo')
    expect(WEEKDAY_LABELS).toHaveLength(7)
  })
})

describe('monthLabel / addMonths / toIso', () => {
  it('labels a month', () => {
    expect(monthLabel(2026, 8)).toBe('September 2026')
  })

  it('rolls over the year in both directions', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
    expect(addMonths(2026, 3, 2)).toEqual({ year: 2026, month: 5 })
  })

  it('formats an iso date', () => {
    expect(toIso(2026, 8, 5)).toBe('2026-09-05')
  })
})

describe('selectDate', () => {
  it('sets the start on the first click', () => {
    expect(selectDate({}, '2026-09-01')).toEqual({ start: '2026-09-01' })
  })

  it('closes the range on the second click', () => {
    expect(selectDate({ start: '2026-09-01' }, '2026-09-05')).toEqual({
      start: '2026-09-01',
      end: '2026-09-05',
    })
  })

  it('restarts when the click lands before the start', () => {
    expect(selectDate({ start: '2026-09-05' }, '2026-09-01')).toEqual({ start: '2026-09-01' })
  })

  it('restarts once a range is complete', () => {
    expect(selectDate({ start: '2026-09-01', end: '2026-09-05' }, '2026-09-10')).toEqual({
      start: '2026-09-10',
    })
  })

  it('treats clicking the start again as keeping a single day', () => {
    expect(selectDate({ start: '2026-09-01' }, '2026-09-01')).toEqual({ start: '2026-09-01' })
  })
})

describe('isInRange / isEdge', () => {
  const range = { start: '2026-09-01', end: '2026-09-05' }

  it('marks the days between the edges', () => {
    expect(isInRange(range, '2026-09-03')).toBe(true)
    expect(isInRange(range, '2026-09-01')).toBe(false)
    expect(isInRange(range, '2026-09-09')).toBe(false)
  })

  it('marks the edges', () => {
    expect(isEdge(range, '2026-09-01')).toBe(true)
    expect(isEdge(range, '2026-09-05')).toBe(true)
    expect(isEdge(range, '2026-09-03')).toBe(false)
  })

  it('has no range while only a start is picked', () => {
    expect(isInRange({ start: '2026-09-01' }, '2026-09-02')).toBe(false)
  })
})

describe('describeRange', () => {
  it('shortens a range inside one month', () => {
    expect(describeRange({ start: '2026-09-01', end: '2026-09-05' })).toBe('Sep 1 – 5')
  })

  it('names both months when it spans two', () => {
    expect(describeRange({ start: '2026-09-28', end: '2026-10-02' })).toBe('Sep 28 – Oct 2')
  })

  it('shows a lone start on its own', () => {
    expect(describeRange({ start: '2026-09-01' })).toBe('Sep 1')
  })

  it('is empty with nothing picked', () => {
    expect(describeRange({})).toBe('')
  })
})
