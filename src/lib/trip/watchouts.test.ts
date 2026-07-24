import { describe, it, expect } from 'vitest'
import { computeWatchouts } from './watchouts'
import { createTrip } from './tripState'
import type { TripState, Stay } from './types'

const stay = (nights: number): Stay => ({
  id: 's1', name: 'Apt', source: 'airbnb', pricePerNight: 100, nights,
  photos: [], bookUrl: 'x',
})

describe('computeWatchouts', () => {
  it('flags a stay whose nights differ from the trip length', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 2, startDate: '2026-09-01', endDate: '2026-09-15' }, // 14 nights
      stays: [stay(10)],
    }
    const w = computeWatchouts(trip)
    expect(w.some((x) => x.id === 'stay-nights-mismatch' && x.severity === 'warning')).toBe(true)
  })

  it('nudges when a stay exists but no flights are added', () => {
    const trip: TripState = { ...createTrip('t'), meta: { travelers: 1 }, stays: [stay(3)] }
    expect(computeWatchouts(trip).some((x) => x.id === 'no-flights')).toBe(true)
  })

  it('nudges to add a return when only one flight exists', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 1 },
      flights: [{ id: 'f1', from: 'SKP', to: 'TFN', price: 100, stops: 0, bookUrl: 'x' }],
    }
    expect(computeWatchouts(trip).some((x) => x.id === 'one-way')).toBe(true)
  })

  it('returns nothing for a coherent trip', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 2, startDate: '2026-09-01', endDate: '2026-09-15' },
      stays: [stay(14)],
      flights: [
        { id: 'f1', from: 'SKP', to: 'TFN', price: 100, stops: 0, bookUrl: 'x' },
        { id: 'f2', from: 'TFN', to: 'SKP', price: 100, stops: 0, bookUrl: 'y' },
      ],
    }
    expect(computeWatchouts(trip)).toEqual([])
  })
})

describe('over-budget', () => {
  it('warns when the estimated total exceeds the budget', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 2, budget: 1000 },
      estimatedTotal: 1500,
    }
    const w = computeWatchouts(trip)
    expect(w.some((x) => x.id === 'over-budget' && x.severity === 'warning')).toBe(true)
  })

  it('does not warn when within budget', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 2, budget: 2000 },
      estimatedTotal: 1500,
    }
    expect(computeWatchouts(trip).some((x) => x.id === 'over-budget')).toBe(false)
  })
})
