import { describe, it, expect } from 'vitest'
import { buildPlannerTools, createPlannerState } from './tools'
import { createInMemoryCache } from '../searchapi/cache'

// Fake SearchApi deps returning canned raw responses per engine.
function fakeDeps(responses: Record<string, unknown>) {
  const cache = createInMemoryCache()
  const search = async <T>(engine: string): Promise<T> => responses[engine] as T
  return { search, cache }
}

// Tool execute helper — calls a tool's execute with empty options.
function run(tool: any, input: unknown) {
  return tool.execute(input, { toolCallId: 't', messages: [] })
}

describe('setTripMeta', () => {
  it('updates meta on the state trip', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    const res = await run(tools.setTripMeta, { destination: 'Rome', travelers: 2 })
    expect(state.trip.meta.destination).toBe('Rome')
    expect(res.meta.travelers).toBe(2)
  })
})

describe('searchFlights + addFlight', () => {
  it('searches, stashes results, and adds by id', async () => {
    const deps = fakeDeps({
      google_flights: {
        best_flights: [
          {
            price: 180,
            total_duration: 130,
            booking_token: 'F1',
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
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)

    const results = await run(tools.searchFlights, {
      departure_id: 'SKP',
      arrival_id: 'FCO',
      outbound_date: '2026-05-01',
    })
    expect(results).toHaveLength(1)
    expect(state.lastFlights).toHaveLength(1)

    const added = await run(tools.addFlight, { id: 'F1' })
    expect(added.added).toBe('F1')
    expect(state.trip.flights).toHaveLength(1)
    expect(state.trip.estimatedTotal).toBe(180)
  })

  it('addFlight returns an error for an unknown id', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    const res = await run(tools.addFlight, { id: 'nope' })
    expect(res.error).toBeTruthy()
    expect(state.trip.flights).toHaveLength(0)
  })
})

describe('searchHotels + addStay', () => {
  it('searches and adds a stay by id', async () => {
    const deps = fakeDeps({
      google_hotels: {
        properties: [
          {
            name: 'Hotel X',
            price_per_night: { extracted_price: 100 },
            rating: 4,
            reviews: 5,
            gps_coordinates: { latitude: 1, longitude: 2 },
            images: [],
            link: 'https://x',
          },
        ],
      },
    })
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)
    await run(tools.searchHotels, {
      q: 'Rome',
      check_in_date: '2026-05-01',
      check_out_date: '2026-05-04',
    })
    const id = state.lastStays[0].id
    const res = await run(tools.addStay, { id })
    expect(res.added).toBe(id)
    expect(state.trip.stays).toHaveLength(1)
    expect(state.trip.estimatedTotal).toBe(300) // 100 * 3 nights
  })
})

describe('searchPlaces + addPlaceToItinerary + getPlaceDetails', () => {
  it('searches places, adds one to a day, and enriches details', async () => {
    const deps = fakeDeps({
      google_maps: {
        local_results: [
          {
            title: 'Colosseum',
            place_id: 'PID1',
            gps_coordinates: { latitude: 41.89, longitude: 12.49 },
            rating: 4.7,
            reviews: 1000,
          },
        ],
      },
      google_maps_reviews: {
        reviews: [{ user: { name: 'A' }, rating: 5, snippet: 'Amazing.' }],
      },
      google_maps_photos: { photos: [{ image: 'https://p/1' }] },
    })
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)

    const places = await run(tools.searchPlaces, { q: 'attractions in Rome', ll: '@41.9,12.5,12z' })
    expect(places[0].id).toBe('PID1')
    expect(state.lastPlaces).toHaveLength(1)

    const added = await run(tools.addPlaceToItinerary, { id: 'PID1', dayIndex: 0 })
    expect(added.added).toBe('Colosseum')
    expect(state.trip.days[0].items[0].placeId).toBe('PID1')

    const details = await run(tools.getPlaceDetails, { id: 'PID1' })
    expect(details.reviews[0].text).toBe('Amazing.')
    expect(details.photos).toEqual(['https://p/1'])
    // enrichment cached on the stashed place
    expect(state.lastPlaces[0].reviewSnippets[0].text).toBe('Amazing.')
  })

  it('removeItineraryItem drops an item from a day', async () => {
    const deps = fakeDeps({
      google_maps: {
        local_results: [{ title: 'X', place_id: 'PIDX', gps_coordinates: { latitude: 1, longitude: 2 } }],
      },
    })
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)
    await run(tools.searchPlaces, { q: 'x' })
    await run(tools.addPlaceToItinerary, { id: 'PIDX', dayIndex: 0 })
    const res = await run(tools.removeItineraryItem, { dayIndex: 0, placeId: 'PIDX' })
    expect(res.removed).toBe('PIDX')
    expect(state.trip.days[0].items).toHaveLength(0)
  })
})
