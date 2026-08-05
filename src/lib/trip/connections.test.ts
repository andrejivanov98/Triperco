import { describe, it, expect } from 'vitest'
import { planConnections } from './connections'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from './tripState'
import type { Flight, Stay, TripState } from './types'

function flight(over: Partial<Flight> & { id: string }): Flight {
  return { from: 'SKP', to: 'FCO', stops: 0, price: 120, bookUrl: 'x', ...over }
}

function stay(over: Partial<Stay> = {}): Stay {
  return {
    id: 's1',
    name: 'Hotel Artemide',
    source: 'hotel',
    pricePerNight: 120,
    nights: 3,
    photos: [],
    bookUrl: 'x',
    address: 'Via Nazionale 22, Rome',
    ...over,
  }
}

function tripWith(build: (t: TripState) => TripState): TripState {
  return build(setMeta(createTrip('t1'), { destination: 'Rome' }))
}

describe('planConnections', () => {
  it('is empty with nowhere to travel from', () => {
    expect(planConnections(createTrip('t1'))).toEqual([])
  })

  it('needs a stay before it can anchor anything', () => {
    // A flight alone implies no journey we could describe: there is no other end to it yet.
    const trip = tripWith((t) => addFlight(t, flight({ id: 'f1' })))
    expect(planConnections(trip)).toEqual([])
  })

  it('connects the arrival airport to the stay', () => {
    const trip = tripWith((t) => addStay(addFlight(t, flight({ id: 'f1' })), stay()))
    const [leg] = planConnections(trip)
    expect(leg.from).toBe('FCO airport')
    expect(leg.to).toContain('Hotel Artemide')
    expect(leg.label).toBe('Airport to your stay')
  })

  it('connects the stay to each thing to do', () => {
    const trip = tripWith((t) => {
      const withStay = addStay(t, stay())
      return addItineraryItem(
        addItineraryItem(withStay, 0, { placeId: 'p1', name: 'Colosseum' }),
        0,
        { placeId: 'p2', name: 'Borghese Gallery' },
      )
    })
    const labels = planConnections(trip).map((c) => c.label)
    expect(labels).toContain('Your stay to Colosseum')
    expect(labels).toContain('Your stay to Borghese Gallery')
  })

  it('treats the way home as its own journey', () => {
    const trip = tripWith((t) =>
      addStay(
        addFlight(addFlight(t, flight({ id: 'f1' })), flight({ id: 'f2', direction: 'return', from: 'FCO', to: 'SKP' })),
        stay(),
      ),
    )
    const labels = planConnections(trip).map((c) => c.label)
    expect(labels).toContain('Airport to your stay')
    expect(labels).toContain('Your stay to the airport')
  })

  it('never asks the same journey twice', () => {
    const trip = tripWith((t) => {
      const withStay = addStay(t, stay())
      return addItineraryItem(
        addItineraryItem(withStay, 0, { placeId: 'p1', name: 'Colosseum' }),
        1,
        { placeId: 'p1', name: 'Colosseum' },
      )
    })
    const keys = planConnections(trip).map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('never routes somewhere to itself', () => {
    const trip = tripWith((t) =>
      addItineraryItem(addStay(t, stay({ name: 'Hotel Artemide' })), 0, {
        placeId: 'p1',
        name: 'Hotel Artemide',
        address: 'Via Nazionale 22, Rome',
      }),
    )
    expect(planConnections(trip)).toEqual([])
  })

  it('gives every leg a stable key, so a fetched answer can be cached against it', () => {
    const trip = tripWith((t) => addStay(addFlight(t, flight({ id: 'f1' })), stay()))
    expect(planConnections(trip)[0].key).toBe(planConnections(trip)[0].key)
    expect(planConnections(trip)[0].key).toMatch(/^arrive:f1:s1$/)
  })

  it('carries the city so a directions lookup is not ambiguous', () => {
    const trip = tripWith((t) => addStay(addFlight(t, flight({ id: 'f1' })), stay()))
    expect(planConnections(trip)[0].to).toBe('Hotel Artemide, Rome')
  })
})
