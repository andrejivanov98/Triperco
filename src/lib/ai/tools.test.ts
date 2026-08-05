import { describe, it, expect } from 'vitest'
import { buildPlannerTools, createPlannerState, allocateEnrichment } from './tools'
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

/**
 * A museum, a restaurant, a walking tour and a concert are four different offers. Merging them into
 * one "things to do" carousel made "visit the Colosseum" and "book a cooking class" arrive as the
 * same kind of suggestion.
 */
describe('searchPlaces — four buckets', () => {
  const mixed = {
    google_maps: {
      local_results: [
        { title: 'Colosseum', place_id: 'sight', type: 'Historical landmark' },
        { title: 'Da Enzo', place_id: 'food', type: 'Trattoria' },
        { title: 'Vespa Tours', place_id: 'tour', type: 'Sightseeing tour agency' },
      ],
    },
    google_maps_reviews: { reviews: [{ rating: 5, snippet: 'Worth it.' }] },
    google_maps_photos: { photos: [{ image: 'https://p/1' }] },
  }

  it('splits one search into a carousel per kind', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state, fakeDeps(mixed))
    await run(tools.searchPlaces, { q: 'things to do in Rome' })

    const kinds = state.pendingResults.map((s) => (s.kind === 'places' ? s.placeKind : null))
    expect(kinds).toContain('attraction')
    expect(kinds).toContain('activity')
    expect(kinds).toContain('tour')
    // Nothing here has a date, so no events carousel is invented.
    expect(kinds).not.toContain('event')
  })

  it('gives each bucket its own set key, so one never supersedes another', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state, fakeDeps(mixed))
    await run(tools.searchPlaces, { q: 'things to do in Rome' })
    const keys = state.pendingResults.map((s) => s.setKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('puts each place in exactly one bucket', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state, fakeDeps(mixed))
    await run(tools.searchPlaces, { q: 'things to do in Rome' })
    const ids = state.pendingResults.flatMap((s) => s.items.map((i) => i.id))
    expect(ids.sort()).toEqual(['food', 'sight', 'tour'])
  })

  it('tells the agent which kind each result is', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state, fakeDeps(mixed))
    const places = await run(tools.searchPlaces, { q: 'things to do in Rome' })
    const byId = new Map(places.map((p: { id: string; kind: string }) => [p.id, p.kind]))
    expect(byId.get('sight')).toBe('attraction')
    expect(byId.get('food')).toBe('activity')
    expect(byId.get('tour')).toBe('tour')
  })

  it('arrives with photos and a real quote, not a bare name', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state, fakeDeps(mixed))
    const places = await run(tools.searchPlaces, { q: 'things to do in Rome' })
    expect(places[0].reviewQuote).toBe('Worth it.')
    // Kept on the stashed copy too, so adding it to the plan carries the photo.
    expect(state.lastPlaces[0].photos).toContain('https://p/1')
  })

  it('surfaces a provider failure as data rather than throwing', async () => {
    const deps = {
      cache: undefined,
      search: async () => {
        throw new Error('502 bad gateway')
      },
    } as never
    const tools = buildPlannerTools(createPlannerState(), deps)
    const result = await run(tools.searchPlaces, { q: 'things to do in Rome' })
    expect(result.error).toMatch(/502/)
  })
})

/**
 * One place search can split four ways, and each enriched place costs two provider calls. A
 * per-bucket budget would have made a single question cost twenty-four of them.
 */
describe('allocateEnrichment', () => {
  it('fills every bucket’s leading card before any bucket gets a second', () => {
    expect(allocateEnrichment([5, 5, 5, 5], 4)).toEqual([1, 1, 1, 1])
  })

  it('spends the whole budget on one bucket when there is only one', () => {
    expect(allocateEnrichment([9], 4)).toEqual([4])
  })

  it('never allocates more than a bucket holds', () => {
    expect(allocateEnrichment([1, 1], 4)).toEqual([1, 1])
  })

  it('hands the spare capacity to the buckets that can use it', () => {
    expect(allocateEnrichment([1, 5], 4)).toEqual([1, 3])
  })

  it('never exceeds the budget in total', () => {
    const quota = allocateEnrichment([10, 10, 10, 10], 4)
    expect(quota.reduce((a, b) => a + b, 0)).toBe(4)
  })

  it('handles no buckets at all', () => {
    expect(allocateEnrichment([], 4)).toEqual([])
  })

  it('stays inside the Balanced budget for a four-way split', () => {
    // Four places enriched, two provider calls each: eight, not twenty-four.
    const total = allocateEnrichment([6, 6, 6, 6]).reduce((a, b) => a + b, 0)
    expect(total * 2).toBeLessThanOrEqual(8)
  })
})
