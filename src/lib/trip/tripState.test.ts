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

import { setMeta } from './tripState'

describe('setMeta', () => {
  it('patches meta immutably and recomputes the total', () => {
    let trip = createTrip('t1')
    trip = {
      ...trip,
      flights: [{ id: 'f1', from: 'A', to: 'B', stops: 0, price: 100, bookUrl: 'https://a' }],
    }
    const updated = setMeta(trip, { destination: 'Rome', travelers: 3 })
    expect(updated.meta.destination).toBe('Rome')
    expect(updated.meta.travelers).toBe(3)
    expect(updated.estimatedTotal).toBe(300) // 100 * 3
    // original untouched
    expect(trip.meta.destination).toBeUndefined()
  })
})

import { addFlight, removeFlight, addStay, removeStay } from './tripState'
import type { Flight, Stay } from './types'

const sampleFlight: Flight = {
  id: 'f1',
  from: 'SKP',
  to: 'FCO',
  stops: 0,
  price: 180,
  bookUrl: 'https://air',
}

const sampleStay: Stay = {
  id: 's1',
  name: 'Hotel Trastevere',
  source: 'hotel',
  pricePerNight: 110,
  nights: 3,
  photos: [],
  bookUrl: 'https://hotel',
}

describe('flights', () => {
  it('adds a flight and recomputes total', () => {
    const trip = addFlight(createTrip('t1'), sampleFlight)
    expect(trip.flights).toHaveLength(1)
    expect(trip.estimatedTotal).toBe(180) // 1 traveler
  })

  it('removes a flight by id', () => {
    const trip = removeFlight(addFlight(createTrip('t1'), sampleFlight), 'f1')
    expect(trip.flights).toHaveLength(0)
    expect(trip.estimatedTotal).toBe(0)
  })
})

describe('stays', () => {
  it('adds a stay and recomputes total', () => {
    const trip = addStay(createTrip('t1'), sampleStay)
    expect(trip.stays).toHaveLength(1)
    expect(trip.estimatedTotal).toBe(330) // 110 * 3
  })

  it('removes a stay by id', () => {
    const trip = removeStay(addStay(createTrip('t1'), sampleStay), 's1')
    expect(trip.stays).toHaveLength(0)
    expect(trip.estimatedTotal).toBe(0)
  })
})
