import { describe, it, expect } from 'vitest'
import { arrivalDayOffset, arrivesNextDay, arrivalDayLabel } from './flightDay'

describe('arrivalDayOffset', () => {
  it('is zero for a flight that lands the same day', () => {
    expect(arrivalDayOffset({ departDate: '2026-08-01', arriveDate: '2026-08-01' })).toBe(0)
  })

  it('catches the red-eye that lands tomorrow', () => {
    expect(arrivalDayOffset({ departDate: '2026-08-01', arriveDate: '2026-08-02' })).toBe(1)
    expect(arrivesNextDay({ departDate: '2026-08-01', arriveDate: '2026-08-02' })).toBe(true)
  })

  it('counts a long haul that crosses two days', () => {
    expect(arrivalDayOffset({ departDate: '2026-08-01', arriveDate: '2026-08-03' })).toBe(2)
  })

  it('crosses a month and a year boundary correctly', () => {
    expect(arrivalDayOffset({ departDate: '2026-08-31', arriveDate: '2026-09-01' })).toBe(1)
    expect(arrivalDayOffset({ departDate: '2026-12-31', arriveDate: '2027-01-01' })).toBe(1)
  })

  it('never reports a negative offset from an eastbound date line crossing', () => {
    expect(arrivalDayOffset({ departDate: '2026-08-02', arriveDate: '2026-08-01' })).toBe(0)
  })

  it('claims nothing when the provider gave no dates', () => {
    expect(arrivalDayOffset({})).toBe(0)
    expect(arrivalDayOffset({ departDate: '2026-08-01' })).toBe(0)
    expect(arrivalDayOffset({ departDate: 'not a date', arriveDate: '2026-08-02' })).toBe(0)
  })
})

describe('arrivalDayLabel', () => {
  it('says nothing for a same-day arrival', () => {
    expect(arrivalDayLabel({ departDate: '2026-08-01', arriveDate: '2026-08-01' })).toBeUndefined()
  })

  it('reads naturally for one day and for more', () => {
    expect(arrivalDayLabel({ departDate: '2026-08-01', arriveDate: '2026-08-02' })).toBe('+1 day')
    expect(arrivalDayLabel({ departDate: '2026-08-01', arriveDate: '2026-08-03' })).toBe('+2 days')
  })
})
