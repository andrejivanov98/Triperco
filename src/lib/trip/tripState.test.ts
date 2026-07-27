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

import { addItineraryItem, removeItineraryItem } from './tripState'
import type { ItineraryItem } from './types'

const colosseum: ItineraryItem = { placeId: 'p1', name: 'Colosseum' }
const vatican: ItineraryItem = { placeId: 'p2', name: 'Vatican' }

describe('itinerary items', () => {
  it('creates days as needed when adding at an index', () => {
    const trip = addItineraryItem(createTrip('t1'), 1, colosseum)
    expect(trip.days).toHaveLength(2) // day 0 (empty) + day 1
    expect(trip.days[0].items).toEqual([])
    expect(trip.days[1].items[0].name).toBe('Colosseum')
  })

  it('appends multiple items to the same day', () => {
    let trip = addItineraryItem(createTrip('t1'), 0, colosseum)
    trip = addItineraryItem(trip, 0, vatican)
    expect(trip.days[0].items).toHaveLength(2)
  })

  it('removes an item by placeId from a day', () => {
    let trip = addItineraryItem(createTrip('t1'), 0, colosseum)
    trip = addItineraryItem(trip, 0, vatican)
    trip = removeItineraryItem(trip, 0, 'p1')
    expect(trip.days[0].items.map((i) => i.placeId)).toEqual(['p2'])
  })
})

describe('adding the same thing twice', () => {
  // The traveler can tap "Add to trip" while the agent is also adding it server-side, and the
  // trip round-trips through both. Adding must be idempotent or totals silently double.
  it('ignores a second copy of the same flight', () => {
    const trip = addFlight(addFlight(createTrip('t1'), sampleFlight), sampleFlight)
    expect(trip.flights).toHaveLength(1)
    expect(trip.estimatedTotal).toBe(180)
  })

  it('ignores a second copy of the same stay and does not double the total', () => {
    const trip = addStay(addStay(createTrip('t1'), sampleStay), sampleStay)
    expect(trip.stays).toHaveLength(1)
    expect(trip.estimatedTotal).toBe(330)
  })

  it('takes the richer version when the same stay is added again', () => {
    const enriched = { ...sampleStay, amenities: ['Pool'], address: 'Via Roma 1' }
    const trip = addStay(addStay(createTrip('t1'), sampleStay), enriched)
    expect(trip.stays).toHaveLength(1)
    expect(trip.stays[0].amenities).toEqual(['Pool'])
    expect(trip.stays[0].address).toBe('Via Roma 1')
  })

  it('ignores a place already on that day', () => {
    let trip = addItineraryItem(createTrip('t1'), 0, colosseum)
    trip = addItineraryItem(trip, 0, colosseum)
    expect(trip.days[0].items).toHaveLength(1)
  })

  it('still allows the same place on a different day', () => {
    let trip = addItineraryItem(createTrip('t1'), 0, colosseum)
    trip = addItineraryItem(trip, 1, colosseum)
    expect(trip.days[0].items).toHaveLength(1)
    expect(trip.days[1].items).toHaveLength(1)
  })

  it('keeps a note added on the second attempt', () => {
    let trip = addItineraryItem(createTrip('t1'), 0, colosseum)
    trip = addItineraryItem(trip, 0, { ...colosseum, note: 'Book the arena floor' })
    expect(trip.days[0].items).toHaveLength(1)
    expect(trip.days[0].items[0].note).toBe('Book the arena floor')
  })
})

describe('flight legs', () => {
  const outbound: Flight = { id: 'out', from: 'SKP', to: 'FCO', stops: 0, price: 140, bookUrl: 'x', direction: 'outbound' }
  const inbound: Flight = { id: 'back', from: 'FCO', to: 'SKP', stops: 0, price: 110, bookUrl: 'y', direction: 'return' }

  it('keeps the outbound first and the return second', () => {
    let trip = addFlight(createTrip('t1'), outbound)
    trip = addFlight(trip, inbound)
    expect(trip.flights.map((f) => f.id)).toEqual(['out', 'back'])
  })

  it('still reads as the way home when the return is added first', () => {
    let trip = addFlight(createTrip('t1'), inbound)
    expect(trip.flights[0].direction).toBe('return')
    // Adding the outbound afterwards sorts it ahead of the return.
    trip = addFlight(trip, outbound)
    expect(trip.flights.map((f) => f.id)).toEqual(['out', 'back'])
  })

  it('fills both legs when a round trip is chosen', () => {
    const roundTrip: Flight = { ...outbound, tripType: 'round_trip', returnLeg: inbound }
    const trip = addFlight(createTrip('t1'), roundTrip)
    expect(trip.flights).toHaveLength(2)
    expect(trip.flights[0].id).toBe('out')
    expect(trip.flights[1].id).toBe('back')
    expect(trip.flights[1].direction).toBe('return')
  })

  it('charges a round trip once, since the pair is one fare', () => {
    const roundTrip: Flight = { ...outbound, tripType: 'round_trip', returnLeg: inbound }
    const trip = addFlight(createTrip('t1'), roundTrip)
    // 140 for the pair × 1 traveler — not 140 + 110.
    expect(trip.estimatedTotal).toBe(140)
    expect(trip.flights[1].price).toBe(0)
  })

  it('does not nest the return leg inside the stored outbound', () => {
    const roundTrip: Flight = { ...outbound, tripType: 'round_trip', returnLeg: inbound }
    const trip = addFlight(createTrip('t1'), roundTrip)
    expect(trip.flights[0].returnLeg).toBeUndefined()
  })

  it('replaces a leg when the same flight is added again', () => {
    let trip = addFlight(createTrip('t1'), outbound)
    trip = addFlight(trip, { ...outbound, price: 155 })
    expect(trip.flights).toHaveLength(1)
    expect(trip.estimatedTotal).toBe(155)
  })
})
