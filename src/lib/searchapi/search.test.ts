import { describe, it, expect } from 'vitest'
import { searchFlights, searchHotels, searchPlaces, getPlaceReviews, getPlacePhotos } from './search'
import { createInMemoryCache } from './cache'

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
