import { describe, it, expect } from 'vitest'
import { buildPlannerTools, createPlannerState, badFlightRoute } from './tools'
import { createInMemoryCache } from '../searchapi/cache'
import { createTrip, setMeta } from '../trip/tripState'
import type { SearchParams } from '../searchapi/client'

/**
 * The reported failure, driven end to end: asked for somewhere to stay in Barcelona, the planner
 * rendered hotels in the United States.
 *
 * It was never a prompt problem. `google_hotels` and `google_maps` resolve a query with no locality in
 * it against their own default, and their default is America — so the wrong question had already been
 * asked by the time any wording could have helped. These cover both halves of the fix: the query is
 * anchored on the way out, and what came back from somewhere else is dropped on the way in.
 */

const BARCELONA = { lat: 41.3874, lng: 2.1686 }
const NEW_YORK = { lat: 40.7128, lng: -74.006 }

function at(point: { lat: number; lng: number }, title = 'Barcelona') {
  return {
    local_results: [
      { title, place_id: `p:${title}`, gps_coordinates: { latitude: point.lat, longitude: point.lng } },
    ],
  }
}

/** A hotels payload placing each property at a point. */
function hotels(properties: { name: string; point: { lat: number; lng: number } }[]) {
  return {
    properties: properties.map((p, i) => ({
      property_token: `t${i}`,
      name: p.name,
      type: 'hotel',
      rate_per_night: { extracted_lowest: 100 },
      gps_coordinates: { latitude: p.point.lat, longitude: p.point.lng },
    })),
  }
}

/** A maps payload placing each place at a point. */
function places(items: { name: string; point: { lat: number; lng: number } }[]) {
  return {
    local_results: items.map((item, i) => ({
      title: item.name,
      place_id: `pl${i}`,
      type: 'Museum',
      gps_coordinates: { latitude: item.point.lat, longitude: item.point.lng },
    })),
  }
}

/**
 * A fake provider that answers per engine and records what it was asked.
 *
 * `google_maps` serves double duty: it geocodes the destination *and* searches places, so the
 * geocode answer is keyed separately by the query that asks for the destination by name.
 */
function fake(responses: Record<string, unknown>, geocodes: Record<string, unknown> = {}) {
  const asked: { engine: string; params: SearchParams }[] = []
  return {
    asked,
    deps: {
      cache: createInMemoryCache(),
      search: async <T,>(engine: string, params: SearchParams): Promise<T> => {
        asked.push({ engine, params })
        const q = String(params.q ?? '')
        if (engine === 'google_maps' && q in geocodes) return geocodes[q] as T
        return (responses[engine] ?? {}) as T
      },
    },
  }
}

function run(tool: any, input: unknown) {
  return tool.execute(input, { toolCallId: 't', messages: [] })
}

function barcelonaTrip() {
  return setMeta(createTrip('t'), {
    destination: 'Barcelona',
    startDate: '2027-05-01',
    endDate: '2027-05-05',
    travelers: 2,
    adults: 2,
  })
}

const staySearch = {
  q: 'hotels',
  check_in_date: '2027-05-01',
  check_out_date: '2027-05-05',
  adults: 2,
}

describe('searchHotels — grounded in the destination', () => {
  it('names the destination in a query that named nowhere', async () => {
    const { asked, deps } = fake(
      { google_hotels: hotels([{ name: 'Hotel Eixample', point: BARCELONA }]) },
      { Barcelona: at(BARCELONA) },
    )
    const tools = buildPlannerTools(createPlannerState(barcelonaTrip()), deps)
    await run(tools.searchHotels, staySearch)

    const search = asked.find((call) => call.engine === 'google_hotels')
    expect(search?.params.q).toBe('hotels in Barcelona')
  })

  it('leaves a query that already says where it is asking about', async () => {
    const { asked, deps } = fake(
      { google_hotels: hotels([{ name: 'Hotel Eixample', point: BARCELONA }]) },
      { Barcelona: at(BARCELONA) },
    )
    const tools = buildPlannerTools(createPlannerState(barcelonaTrip()), deps)
    await run(tools.searchHotels, { ...staySearch, q: 'boutique hotels in Barcelona' })

    const search = asked.find((call) => call.engine === 'google_hotels')
    expect(search?.params.q).toBe('boutique hotels in Barcelona')
  })

  /** The bug in one assertion: an American hotel must never reach the carousel. */
  it('drops a stay that is not anywhere near the destination', async () => {
    const { deps } = fake(
      {
        google_hotels: hotels([
          { name: 'Hotel Eixample', point: BARCELONA },
          { name: 'The Manhattan', point: NEW_YORK },
        ]),
      },
      { Barcelona: at(BARCELONA) },
    )
    const state = createPlannerState(barcelonaTrip())
    const tools = buildPlannerTools(state, deps)
    const result = await run(tools.searchHotels, staySearch)

    expect(result.map((s: { name: string }) => s.name)).toEqual(['Hotel Eixample'])
    expect(state.pendingResults[0].items).toHaveLength(1)
    expect(state.lastStays.map((s) => s.name)).toEqual(['Hotel Eixample'])
  })

  /*
   * Nothing at the destination and plenty elsewhere is not an empty search — it is a search that
   * landed in the wrong country. Told so, the model searches again; handed the results, it would
   * describe a carousel the traveler is not looking at.
   */
  it('reports a search that landed in the wrong country rather than rendering it', async () => {
    const { deps } = fake(
      { google_hotels: hotels([{ name: 'The Manhattan', point: NEW_YORK }]) },
      { Barcelona: at(BARCELONA) },
    )
    const state = createPlannerState(barcelonaTrip())
    const tools = buildPlannerTools(state, deps)
    const result = await run(tools.searchHotels, staySearch)

    expect(result.error).toContain('Barcelona')
    expect(state.pendingResults).toHaveLength(0)
  })

  /** A filter we cannot justify is worse than no filter: an unplaceable destination fences nothing. */
  it('fences nothing when the destination itself cannot be placed', async () => {
    const { deps } = fake({
      google_hotels: hotels([{ name: 'The Manhattan', point: NEW_YORK }]),
    })
    const state = createPlannerState(barcelonaTrip())
    const tools = buildPlannerTools(state, deps)
    const result = await run(tools.searchHotels, staySearch)

    expect(result).toHaveLength(1)
    expect(state.pendingResults).toHaveLength(1)
  })

  it('does nothing to a search made before a destination is known', async () => {
    const { asked, deps } = fake({
      google_hotels: hotels([{ name: 'Somewhere', point: NEW_YORK }]),
    })
    const tools = buildPlannerTools(createPlannerState(), deps)
    await run(tools.searchHotels, staySearch)

    expect(asked.find((call) => call.engine === 'google_hotels')?.params.q).toBe('hotels')
    // No destination is nothing to geocode, so nothing was paid for.
    expect(asked.filter((call) => call.engine === 'google_maps')).toHaveLength(0)
  })
})

describe('searchPlaces — grounded in the destination', () => {
  it('names the destination and biases the search to it', async () => {
    const { asked, deps } = fake({}, {
      Barcelona: at(BARCELONA),
      'best restaurants in Barcelona': places([{ name: 'Cal Pep', point: BARCELONA }]),
    })
    const tools = buildPlannerTools(createPlannerState(barcelonaTrip()), deps)
    await run(tools.searchPlaces, { q: 'best restaurants' })

    const search = asked.find((call) => call.params.q === 'best restaurants in Barcelona')
    expect(search).toBeDefined()
    expect(search?.params.ll).toBe('@41.3874,2.1686,12z')
  })

  it('leaves a bias the model gave for itself', async () => {
    const { asked, deps } = fake({}, {
      Barcelona: at(BARCELONA),
      'top sights in Barcelona': places([{ name: 'Sagrada Família', point: BARCELONA }]),
    })
    const tools = buildPlannerTools(createPlannerState(barcelonaTrip()), deps)
    await run(tools.searchPlaces, { q: 'top sights in Barcelona', ll: '@41.4,2.17,15z' })

    const search = asked.find((call) => call.params.q === 'top sights in Barcelona')
    expect(search?.params.ll).toBe('@41.4,2.17,15z')
  })

  it('drops a place that is on another continent', async () => {
    const { deps } = fake({}, {
      Barcelona: at(BARCELONA),
      'top sights in Barcelona': places([
        { name: 'Sagrada Família', point: BARCELONA },
        { name: 'Empire State Building', point: NEW_YORK },
      ]),
    })
    const state = createPlannerState(barcelonaTrip())
    const tools = buildPlannerTools(state, deps)
    const result = await run(tools.searchPlaces, { q: 'top sights' })

    expect(result.map((p: { name: string }) => p.name)).toEqual(['Sagrada Família'])
    expect(state.pendingResults.flatMap((set) => [...set.items])).toHaveLength(1)
  })

  it('reports a search that landed elsewhere rather than rendering it', async () => {
    const { deps } = fake({}, {
      Barcelona: at(BARCELONA),
      'top sights in Barcelona': places([{ name: 'Empire State Building', point: NEW_YORK }]),
    })
    const state = createPlannerState(barcelonaTrip())
    const tools = buildPlannerTools(state, deps)
    const result = await run(tools.searchPlaces, { q: 'top sights' })

    expect(result.error).toContain('Barcelona')
    expect(state.pendingResults).toHaveLength(0)
  })

  /** One geocode for the turn, however many searches it runs. */
  it('places the destination once, not once per search', async () => {
    const { asked, deps } = fake({}, {
      Barcelona: at(BARCELONA),
      'top sights in Barcelona': places([{ name: 'Sagrada Família', point: BARCELONA }]),
      'best restaurants in Barcelona': places([{ name: 'Cal Pep', point: BARCELONA }]),
    })
    const tools = buildPlannerTools(createPlannerState(barcelonaTrip()), deps)
    await run(tools.searchPlaces, { q: 'top sights' })
    await run(tools.searchPlaces, { q: 'best restaurants' })

    expect(asked.filter((call) => call.params.q === 'Barcelona')).toHaveLength(1)
  })
})

describe('searchEvents — grounded in the destination', () => {
  it('names the destination in the query', async () => {
    const { asked, deps } = fake({ google_events: {} }, { Barcelona: at(BARCELONA) })
    const tools = buildPlannerTools(createPlannerState(barcelonaTrip()), deps)
    await run(tools.searchEvents, { q: 'concerts this week' })

    expect(asked.find((call) => call.engine === 'google_events')?.params.q).toBe(
      'concerts this week in Barcelona',
    )
  })
})

/**
 * Flights get the certainties only.
 *
 * Deliberately no distance fence on the arrival airport: a destination named loosely — "Spain", "the
 * Canaries" — geocodes to a centre hundreds of kilometres from the airport a traveler would actually
 * use, and refusing that search would be a worse bug than the one being fixed.
 */
describe('badFlightRoute', () => {
  const trip = setMeta(createTrip('t'), { destination: 'Barcelona', origin: 'SKP', travelers: 1 })

  it('refuses a flight from an airport to itself', () => {
    expect(badFlightRoute({ departure_id: 'BCN', arrival_id: 'bcn' }, trip)).toContain('BCN')
  })

  it('refuses an outbound leg that lands back where they set off from', () => {
    const problem = badFlightRoute({ departure_id: 'BCN', arrival_id: 'SKP' }, trip)
    expect(problem).toContain('setting off from')
    expect(problem).toContain('Barcelona')
  })

  it('allows the flight home, which is exactly that route on purpose', () => {
    expect(
      badFlightRoute({ departure_id: 'BCN', arrival_id: 'SKP', direction: 'return' }, trip),
    ).toBeNull()
  })

  it('allows a normal outbound', () => {
    expect(badFlightRoute({ departure_id: 'SKP', arrival_id: 'BCN' }, trip)).toBeNull()
  })

  it('says nothing about a route it cannot judge', () => {
    const noOrigin = setMeta(createTrip('t'), { destination: 'Barcelona', travelers: 1 })
    expect(badFlightRoute({ departure_id: 'SKP', arrival_id: 'BCN' }, noOrigin)).toBeNull()
  })

  it('is enforced by the tool, not just available to it', async () => {
    const { asked, deps } = fake({ google_flights: {} })
    const tools = buildPlannerTools(createPlannerState(trip), deps)
    const result = await run(tools.searchFlights, {
      departure_id: 'BCN',
      arrival_id: 'SKP',
      outbound_date: '2027-05-01',
    })

    expect(result.error).toContain('setting off from')
    // Refused before the provider was paid for it.
    expect(asked.filter((call) => call.engine === 'google_flights')).toHaveLength(0)
  })
})
