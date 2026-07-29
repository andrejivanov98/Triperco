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

describe('guided interaction tools', () => {
  it('presentOptions queues an option set', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    const res = await run(tools.presentOptions, {
      question: 'Start with',
      options: [{ label: 'Find a hotel', prompt: 'Find me a hotel' }],
    })
    expect(res.presented).toBe(1)
    expect(state.pendingOptions[0].options[0].label).toBe('Find a hotel')
  })

  it('askPreferences queues a form', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    await run(tools.askPreferences, { question: 'Interests?', mode: 'multi', options: ['Beaches', 'Hikes'] })
    expect(state.pendingForms[0]).toMatchObject({ mode: 'multi' })
  })

  it('setTripMeta accepts a title', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    await run(tools.setTripMeta, { title: 'Tenerife Escape' })
    expect(state.trip.meta.title).toBe('Tenerife Escape')
  })
})

describe('the agent cannot touch the plan', () => {
  it('exposes no tool that adds to or removes from the plan', () => {
    const tools = buildPlannerTools(createPlannerState())
    for (const name of [
      'addFlight',
      'removeFlight',
      'addStay',
      'removeStay',
      'addPlaceToItinerary',
      'removeItineraryItem',
    ]) {
      expect(tools).not.toHaveProperty(name)
    }
  })

  it('leaves the plan untouched while searching', async () => {
    const deps = fakeDeps({
      google_flights: {
        best_flights: [
          {
            price: 180,
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
      google_hotels: {
        properties: [{ name: 'Hotel X', price_per_night: { extracted_price: 100 }, link: 'https://x' }],
      },
      google_maps: { local_results: [{ title: 'Colosseum', place_id: 'PID1' }] },
    })
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)

    await run(tools.searchFlights, {
      departure_id: 'SKP',
      arrival_id: 'FCO',
      outbound_date: '2026-05-01',
    })
    await run(tools.searchHotels, { q: 'Rome', check_in_date: '2026-05-01', check_out_date: '2026-05-04' })
    await run(tools.searchPlaces, { q: 'attractions in Rome' })

    expect(state.trip.flights).toEqual([])
    expect(state.trip.stays).toEqual([])
    expect(state.trip.days).toEqual([])
    expect(state.trip.estimatedTotal).toBe(0)
  })
})

describe('searchFlights', () => {
  it('searches and stashes results for the traveler to choose from', async () => {
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
    expect(state.pendingResults).toHaveLength(1)
    expect(state.pendingResults[0]).toMatchObject({ kind: 'flights' })
    expect(state.pendingResults[0].items).toHaveLength(1)
  })
})

describe('searchHotels', () => {
  it('searches and stashes stays', async () => {
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
    const results = await run(tools.searchHotels, {
      q: 'Rome',
      check_in_date: '2026-05-01',
      check_out_date: '2026-05-04',
    })
    expect(results[0].name).toBe('Hotel X')
    expect(state.lastStays[0].nights).toBe(3)
    expect(state.pendingResults[0]).toMatchObject({ kind: 'stays' })
  })
})

describe('searchPlaces + getPlaceDetails', () => {
  it('searches places and enriches one with reviews and photos', async () => {
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

    const details = await run(tools.getPlaceDetails, { id: 'PID1' })
    expect(details.reviews[0].text).toBe('Amazing.')
    expect(details.photos).toEqual(['https://p/1'])
    // enrichment cached on the stashed place
    expect(state.lastPlaces[0].reviewSnippets[0].text).toBe('Amazing.')
  })
})
