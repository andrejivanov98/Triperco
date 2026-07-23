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
