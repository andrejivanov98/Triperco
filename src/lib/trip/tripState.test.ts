import { describe, it, expect } from 'vitest'
import { createTrip, computeEstimatedTotal } from './tripState'
import type { TripState } from './types'

describe('createTrip', () => {
  it('creates an empty trip with sensible defaults', () => {
    const trip = createTrip('t1')
    expect(trip.id).toBe('t1')
    expect(trip.meta.travelers).toBe(1)
    expect(trip.flights).toEqual([])
    expect(trip.stays).toEqual([])
    expect(trip.days).toEqual([])
    expect(trip.estimatedTotal).toBe(0)
  })
})

describe('computeEstimatedTotal', () => {
  it('sums flights (per traveler) and stays (per night)', () => {
    const trip: TripState = {
      id: 't1',
      meta: { travelers: 2 },
      flights: [
        { id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 180, bookUrl: 'https://a' },
      ],
      stays: [
        {
          id: 's1',
          name: 'Hotel',
          source: 'hotel',
          pricePerNight: 100,
          nights: 3,
          photos: [],
          bookUrl: 'https://b',
        },
      ],
      days: [],
      estimatedTotal: 0,
    }
    // flights: 180 * 2 travelers = 360; stays: 100 * 3 nights = 300 => 660
    expect(computeEstimatedTotal(trip)).toBe(660)
  })

  it('treats travelers below 1 as 1', () => {
    const trip = { ...createTrip('t1'), meta: { travelers: 0 } }
    const withFlight: TripState = {
      ...trip,
      flights: [{ id: 'f1', from: 'A', to: 'B', stops: 0, price: 50, bookUrl: 'https://a' }],
    }
    expect(computeEstimatedTotal(withFlight)).toBe(50)
  })
})
