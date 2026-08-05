import { describe, it, expect } from 'vitest'
import {
  searchFlights,
  searchHotels,
  searchPlaces,
  getPlaceReviews,
  getPlacePhotos,
  getStayDetails,
  getDestinationPhoto,
  enrichPlaces,
} from './search'
import { createInMemoryCache } from './cache'
import type { Place } from '../trip/types'

// A fake search fn that records calls and returns canned raw responses per engine.
function fakeDeps(responses: Record<string, unknown>) {
  const calls: string[] = []
  const cache = createInMemoryCache()
  const search = async <T>(engine: string): Promise<T> => {
    calls.push(engine)
    return responses[engine] as T
  }
  return { deps: { search, cache }, calls }
}

describe('searchFlights', () => {
  it('normalizes and caches by query', async () => {
    const { deps, calls } = fakeDeps({
      google_flights: {
        best_flights: [
          {
            price: 180,
            total_duration: 130,
            booking_token: 't',
            flights: [
              {
                airline: 'Wizz',
                flight_number: 'W6 1',
                departure_airport: { id: 'SKP', time: '10:00', date: '2026-05-01' },
                arrival_airport: { id: 'FCO', time: '12:10' },
              },
            ],
            layovers: [],
          },
        ],
      },
    })
    const params = { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-05-01' }
    const first = await searchFlights(params, deps)
    const second = await searchFlights(params, deps)
    expect(first).toHaveLength(1)
    expect(first[0].to).toBe('FCO')
    expect(second).toEqual(first)
    expect(calls.filter((c) => c === 'google_flights')).toHaveLength(1) // cached
  })
})

describe('searchHotels', () => {
  it('computes nights from dates and normalizes', async () => {
    const { deps } = fakeDeps({
      google_hotels: {
        properties: [
          {
            name: 'Hotel X',
            price_per_night: { extracted_price: 100 },
            rating: 4.2,
            reviews: 10,
            gps_coordinates: { latitude: 1, longitude: 2 },
            images: [],
            link: 'https://x',
          },
        ],
      },
    })
    const stays = await searchHotels(
      { q: 'Rome', check_in_date: '2026-05-01', check_out_date: '2026-05-04', adults: 2 },
      deps,
    )
    expect(stays[0].nights).toBe(3)
    expect(stays[0].pricePerNight).toBe(100)
  })
})

describe('getStayDetails', () => {
  const dates = { check_in_date: '2026-05-01', check_out_date: '2026-05-03' }

  it('uses the dedicated property engine and returns the enriched stay', async () => {
    const { deps, calls } = fakeDeps({
      google_hotels_property: {
        property: {
          name: 'Hotel X',
          address: 'Via Roma 1',
          amenities: ['Pool'],
          price_per_night: { extracted_price: 120 },
          reviews_histogram: { 5: 100 },
        },
      },
    })
    const stay = await getStayDetails({ property_token: 'tok', ...dates }, deps)
    expect(stay?.address).toBe('Via Roma 1')
    expect(stay?.amenities).toEqual(['Pool'])
    expect(stay?.ratingsBreakdown).toEqual([{ stars: 5, count: 100 }])
    expect(stay?.nights).toBe(2)
    expect(calls).toEqual(['google_hotels_property'])
  })

  it('returns null when the provider has nothing', async () => {
    const { deps } = fakeDeps({ google_hotels_property: {} })
    expect(await getStayDetails({ property_token: 'tok', ...dates }, deps)).toBeNull()
  })
})

describe('searchFlights round trips', () => {
  it('passes the return date through for a round trip', async () => {
    const captured: Record<string, unknown>[] = []
    const deps = {
      cache: createInMemoryCache(),
      search: async <T,>(_engine: string, params: Record<string, unknown>): Promise<T> => {
        captured.push(params)
        return {} as T
      },
    }
    await searchFlights(
      {
        departure_id: 'SKP',
        arrival_id: 'FCO',
        outbound_date: '2026-09-10',
        return_date: '2026-09-14',
        flight_type: 'round_trip',
      },
      deps,
    )
    expect(captured[0]).toMatchObject({ flight_type: 'round_trip', return_date: '2026-09-14' })
  })

  it('falls back to one way when a round trip has no return date', async () => {
    const captured: Record<string, unknown>[] = []
    const deps = {
      cache: createInMemoryCache(),
      search: async <T,>(_engine: string, params: Record<string, unknown>): Promise<T> => {
        captured.push(params)
        return {} as T
      },
    }
    await searchFlights(
      {
        departure_id: 'SKP',
        arrival_id: 'FCO',
        outbound_date: '2026-09-10',
        flight_type: 'round_trip',
      },
      deps,
    )
    expect(captured[0]).toMatchObject({ flight_type: 'one_way' })
    expect(captured[0].return_date).toBeUndefined()
  })
})

describe('searchPlaces', () => {
  it('normalizes local results', async () => {
    const { deps } = fakeDeps({
      google_maps: {
        local_results: [
          { title: 'Colosseum', place_id: 'PID1', gps_coordinates: { latitude: 1, longitude: 2 } },
        ],
      },
    })
    const places = await searchPlaces({ q: 'attractions', ll: '@1,2,12z' }, deps)
    expect(places[0].name).toBe('Colosseum')
  })
})

describe('getDestinationPhoto', () => {
  it('finds the city on maps and returns its first photo', async () => {
    const { deps, calls } = fakeDeps({
      google_maps: { local_results: [{ title: 'Rome', place_id: 'PID_ROME' }] },
      google_maps_photos: { photos: [{ image: 'https://p/rome-1' }, { image: 'https://p/rome-2' }] },
    })
    expect(await getDestinationPhoto('Rome', deps)).toBe('https://p/rome-1')
    expect(calls).toEqual(['google_maps', 'google_maps_photos'])
  })

  it('falls back to the search thumbnail when there are no gallery photos', async () => {
    const { deps } = fakeDeps({
      google_maps: { local_results: [{ title: 'Rome', place_id: 'P', thumbnail: 'https://t/rome' }] },
      google_maps_photos: {},
    })
    expect(await getDestinationPhoto('Rome', deps)).toBe('https://t/rome')
  })

  it('answers null when the city is not found', async () => {
    const { deps } = fakeDeps({ google_maps: {} })
    expect(await getDestinationPhoto('Nowhere', deps)).toBeNull()
  })

  it('swallows provider failures — a cover photo is cosmetic', async () => {
    const deps = {
      cache: createInMemoryCache(),
      search: async () => {
        throw new Error('provider down')
      },
    }
    expect(await getDestinationPhoto('Rome', deps)).toBeNull()
  })
})

describe('getPlaceReviews / getPlacePhotos', () => {
  it('returns normalized reviews', async () => {
    const { deps } = fakeDeps({
      google_maps_reviews: { reviews: [{ user: { name: 'A' }, rating: 5, snippet: 'Great' }] },
    })
    const reviews = await getPlaceReviews('PID1', deps)
    expect(reviews[0].text).toBe('Great')
  })

  it('returns normalized photos', async () => {
    const { deps } = fakeDeps({
      google_maps_photos: { photos: [{ image: 'https://p/1' }] },
    })
    const photos = await getPlacePhotos('PID1', deps)
    expect(photos).toEqual(['https://p/1'])
  })
})

describe('searchFlights — legs', () => {
  const outboundResponse = {
    best_flights: [
      {
        price: 140,
        type: 'Round trip',
        booking_token: 'OUT1',
        departure_token: 'TOK1',
        flights: [
          {
            airline: 'Wizz',
            flight_number: 'W6 1',
            departure_airport: { id: 'SKP', time: '16:10', date: '2026-09-10' },
            arrival_airport: { id: 'FCO', time: '17:55', date: '2026-09-10' },
          },
        ],
      },
    ],
  }
  const returnResponse = {
    other_flights: [
      {
        price: 140,
        type: 'Round trip',
        booking_token: 'RET1',
        flights: [
          {
            airline: 'Wizz',
            flight_number: 'W6 2',
            departure_airport: { id: 'FCO', time: '09:25', date: '2026-09-14' },
            arrival_airport: { id: 'SKP', time: '11:00', date: '2026-09-14' },
          },
        ],
      },
    ],
  }

  /** The provider answers the same engine differently depending on departure_token. */
  function twoStepDeps() {
    const calls: Record<string, unknown>[] = []
    const deps = {
      cache: createInMemoryCache(),
      search: async <T,>(_engine: string, params: Record<string, unknown>): Promise<T> => {
        calls.push(params)
        return (params.departure_token ? returnResponse : outboundResponse) as T
      },
    }
    return { deps, calls }
  }

  it('pairs each round trip with its return leg', async () => {
    const { deps, calls } = twoStepDeps()
    const flights = await searchFlights(
      {
        departure_id: 'SKP',
        arrival_id: 'FCO',
        outbound_date: '2026-09-10',
        return_date: '2026-09-14',
        flight_type: 'round_trip',
      },
      deps,
    )
    expect(flights).toHaveLength(1)
    expect(flights[0].direction).toBe('outbound')
    expect(flights[0].tripType).toBe('round_trip')
    expect(flights[0].returnLeg?.from).toBe('FCO')
    expect(flights[0].returnLeg?.to).toBe('SKP')
    expect(flights[0].returnLeg?.direction).toBe('return')
    // Second call carried the token from the first.
    expect(calls[1].departure_token).toBe('TOK1')
  })

  it('marks a deliberate return-only search as the way home', async () => {
    const { deps, calls } = twoStepDeps()
    const flights = await searchFlights(
      {
        departure_id: 'FCO',
        arrival_id: 'SKP',
        outbound_date: '2026-09-14',
        direction: 'return',
      },
      deps,
    )
    expect(flights[0].direction).toBe('return')
    expect(flights[0].returnLeg).toBeUndefined()
    expect(calls).toHaveLength(1) // one-way: no token dance
  })

  it('still returns the outbound options when the provider offers no returns', async () => {
    const deps = {
      cache: createInMemoryCache(),
      search: async <T,>(_e: string, params: Record<string, unknown>): Promise<T> =>
        (params.departure_token ? {} : outboundResponse) as T,
    }
    const flights = await searchFlights(
      {
        departure_id: 'SKP',
        arrival_id: 'FCO',
        outbound_date: '2026-09-10',
        return_date: '2026-09-14',
        flight_type: 'round_trip',
      },
      deps,
    )
    expect(flights).toHaveLength(1)
    expect(flights[0].returnLeg).toBeUndefined()
  })
})

/**
 * A search result carries one thumbnail and at most one review quote. Everything that makes a
 * "things to do" card worth looking at has to be fetched per place, so the first few are fetched up
 * front and the rest fill in on demand.
 */
describe('enrichPlaces', () => {
  function place(id: string): Place {
    return { id, name: id, photos: ['https://thumb'], reviewSnippets: [], sourceLinks: {} }
  }

  function enrichDeps() {
    const calls: string[] = []
    const search = async <T>(engine: string): Promise<T> => {
      calls.push(engine)
      return (
        engine === 'google_maps_photos'
          ? { photos: [{ image: 'https://p/1' }, { image: 'https://p/2' }] }
          : { reviews: [{ rating: 5, snippet: 'Worth the queue.' }] }
      ) as T
    }
    return { deps: { search, cache: createInMemoryCache() }, calls }
  }

  it('merges photos and reviews onto a place', async () => {
    const { deps } = enrichDeps()
    const [enriched] = await enrichPlaces([place('a')], 1, deps)
    expect(enriched.photos).toContain('https://p/1')
    expect(enriched.reviewSnippets[0].text).toBe('Worth the queue.')
  })

  it('keeps the thumbnail the search already gave us', async () => {
    const { deps } = enrichDeps()
    const [enriched] = await enrichPlaces([place('a')], 1, deps)
    expect(enriched.photos[0]).toBe('https://thumb')
  })

  it('enriches only the first few, leaving the rest untouched', async () => {
    const { deps, calls } = enrichDeps()
    const places = ['a', 'b', 'c', 'd', 'e'].map(place)
    const result = await enrichPlaces(places, 2, deps)
    expect(result[0].reviewSnippets).toHaveLength(1)
    expect(result[4].reviewSnippets).toHaveLength(0)
    // Two places, two lookups each.
    expect(calls).toHaveLength(4)
  })

  it('never re-orders the list it was given', async () => {
    const { deps } = enrichDeps()
    const places = ['a', 'b', 'c'].map(place)
    const result = await enrichPlaces(places, 2, deps)
    expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns the places untouched when asked for none', async () => {
    const { deps, calls } = enrichDeps()
    const places = [place('a')]
    expect(await enrichPlaces(places, 0, deps)).toEqual(places)
    expect(calls).toHaveLength(0)
  })

  it('keeps the search when a lookup fails — a missing gallery is cosmetic', async () => {
    const deps = {
      cache: createInMemoryCache(),
      search: async <T>(engine: string): Promise<T> => {
        if (engine === 'google_maps_photos') throw new Error('503')
        return { reviews: [{ rating: 5, snippet: 'Lovely.' }] } as T
      },
    }
    const [enriched] = await enrichPlaces([place('a')], 1, deps)
    expect(enriched.photos).toEqual(['https://thumb'])
    expect(enriched.reviewSnippets[0].text).toBe('Lovely.')
  })
})
