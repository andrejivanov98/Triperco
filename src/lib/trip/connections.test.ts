import { describe, it, expect } from 'vitest'
import { planConnections, connectionCandidates } from './connections'
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

/**
 * The plan used to report "no route came back" for hops Google Maps routes without hesitating. The
 * journey was never the problem — the *question* was. A directions engine answers a name, and a name
 * it cannot place comes back empty with no error to distinguish it from a genuinely routeless leg.
 *
 * So every end is describable more than one way, and the lookup works down the list.
 */
describe('planConnections — describing each end more than one way', () => {
  it('leads with the airport the provider named, keeping the code as a fallback', () => {
    const trip = tripWith((t) =>
      addStay(
        addFlight(
          t,
          flight({
            id: 'f1',
            segments: [
              {
                fromCode: 'SKP',
                fromName: 'Skopje International Airport',
                toCode: 'FCO',
                toName: 'Leonardo da Vinci International Airport',
              },
            ],
          }),
        ),
        stay(),
      ),
    )
    const [leg] = planConnections(trip)
    expect(leg.from).toBe('Leonardo da Vinci International Airport')
    expect(leg.fromAlternates).toContain('FCO airport')
  })

  it('still names the airport by code when no segment says otherwise', () => {
    const trip = tripWith((t) => addStay(addFlight(t, flight({ id: 'f1' })), stay()))
    expect(planConnections(trip)[0].from).toBe('FCO airport')
  })

  it('offers the stay’s coordinates and full address behind its name', () => {
    const trip = tripWith((t) =>
      addStay(addFlight(t, flight({ id: 'f1' })), stay({ coords: { lat: 41.9, lng: 12.49 } })),
    )
    const [leg] = planConnections(trip)
    expect(leg.to).toBe('Hotel Artemide, Rome')
    expect(leg.toAlternates).toEqual(['41.9,12.49', 'Via Nazionale 22, Rome', 'Hotel Artemide'])
  })

  it('offers the same for a thing to do', () => {
    const trip = tripWith((t) =>
      addItineraryItem(addStay(t, stay()), 0, {
        placeId: 'p1',
        name: 'Colosseum',
        coords: { lat: 41.8902, lng: 12.4922 },
        address: 'Piazza del Colosseo 1, Rome',
      }),
    )
    const [leg] = planConnections(trip)
    expect(leg.to).toBe('Colosseum, Rome')
    expect(leg.toAlternates?.[0]).toBe('41.8902,12.4922')
  })

  it('has nothing to fall back on when the provider gave nothing to fall back on', () => {
    const trip = tripWith((t) =>
      addItineraryItem(addStay(t, stay()), 0, { placeId: 'p1', name: 'Colosseum' }),
    )
    const leg = planConnections(trip).find((c) => c.label.includes('Colosseum'))!
    expect(leg.to).toBe('Colosseum')
    expect(leg.toAlternates).toEqual([])
  })
})

describe('connectionCandidates', () => {
  it('asks the best-named version of the journey first', () => {
    expect(
      connectionCandidates({ from: 'FCO airport', to: 'Hotel Artemide, Rome' })[0],
    ).toEqual({ from: 'FCO airport', to: 'Hotel Artemide, Rome' })
  })

  /*
   * Paired index by index rather than every combination. A name the geocoder cannot place is almost
   * always one end, and nine variants of one journey would be nine provider calls to find that out.
   */
  it('walks both ends down together rather than trying every pairing', () => {
    expect(
      connectionCandidates({
        from: 'FCO airport',
        fromAlternates: ['41.8,12.25'],
        to: 'Hotel Artemide, Rome',
        toAlternates: ['41.9,12.49', 'Via Nazionale 22, Rome'],
      }),
    ).toEqual([
      { from: 'FCO airport', to: 'Hotel Artemide, Rome' },
      { from: '41.8,12.25', to: '41.9,12.49' },
      { from: '41.8,12.25', to: 'Via Nazionale 22, Rome' },
    ])
  })

  it('is just the one pairing when neither end has another name', () => {
    expect(connectionCandidates({ from: 'a', to: 'b' })).toHaveLength(1)
  })
})
