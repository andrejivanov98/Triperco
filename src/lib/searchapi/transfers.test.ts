import { describe, it, expect, vi } from 'vitest'
import { getTransferOptions, findTransferOptions, findTransferRoute } from './search'
import { createInMemoryCache } from './cache'

/** Shaped exactly like a verified google_maps_directions payload. */
const raw = {
  travel_modes: [
    { travel_mode: 'Driving', formatted_duration: '27 min', duration: 1612 },
    { travel_mode: 'Transit', formatted_duration: '53 min', duration: 3180 },
    { travel_mode: 'Walking', formatted_duration: '3 hr 27', duration: 12429 },
  ],
  directions: [
    {
      travel_mode: 'Driving',
      formatted_duration: '26 min',
      duration: 1579,
      formatted_distance: '17.5 km',
      via: 'Raccordo Autostradale Torino - Caselle/RA10',
    },
  ],
}

function deps(payload: unknown = raw) {
  const calls: Record<string, unknown>[] = []
  return {
    calls,
    deps: {
      cache: createInMemoryCache(),
      search: async <T,>(_engine: string, params: Record<string, unknown>): Promise<T> => {
        calls.push(params)
        return payload as T
      },
    },
  }
}

describe('getTransferOptions', () => {
  it('offers every way of covering the ground, with real times', async () => {
    const { deps: d } = deps()
    const options = await getTransferOptions('Turin Airport', 'Piazza Castello, Turin', d)
    expect(options.map((o) => o.mode)).toEqual(['Driving', 'Transit', 'Walking'])
    expect(options[0]).toMatchObject({ duration: '27 min', durationSeconds: 1612 })
    expect(options[1]).toMatchObject({ mode: 'Transit', duration: '53 min' })
  })

  it('adds the distance and the road for the routed mode', async () => {
    const { deps: d } = deps()
    const [driving] = await getTransferOptions('a', 'b', d)
    expect(driving.distance).toBe('17.5 km')
    expect(driving.via).toContain('Caselle')
  })

  it('leaves distance off a mode the provider did not route', async () => {
    const { deps: d } = deps()
    const options = await getTransferOptions('a', 'b', d)
    expect(options[1]).not.toHaveProperty('distance')
  })

  it('passes both ends to the provider', async () => {
    const { calls, deps: d } = deps()
    await getTransferOptions('Turin Airport', 'Hotel X', d)
    expect(calls[0]).toMatchObject({ from: 'Turin Airport', to: 'Hotel X' })
  })

  it('returns nothing rather than failing on an empty response', async () => {
    const { deps: d } = deps({})
    await expect(getTransferOptions('a', 'b', d)).resolves.toEqual([])
  })

  it('skips a mode with no name', async () => {
    const { deps: d } = deps({ travel_modes: [{ formatted_duration: '5 min' }] })
    await expect(getTransferOptions('a', 'b', d)).resolves.toEqual([])
  })

  /**
   * `travel_modes` is the summary row and `directions` is the routed detail. Reading only the
   * summary threw away journeys the provider had described in full, and reported "no route" for
   * them — a claim the traveler disproved by tapping Directions.
   */
  it('reads the routed directions when the provider sent no summary row', async () => {
    const { deps: d } = deps({
      directions: [
        { travel_mode: 'Driving', formatted_duration: '26 min', duration: 1579, formatted_distance: '17.5 km' },
        { travel_mode: 'Transit', formatted_duration: '53 min', duration: 3180 },
      ],
    })
    const options = await getTransferOptions('a', 'b', d)
    expect(options.map((o) => o.mode)).toEqual(['Driving', 'Transit'])
    expect(options[0]).toMatchObject({ duration: '26 min', durationSeconds: 1579, distance: '17.5 km' })
  })

  it('names a mode once, however many routes the provider gave for it', async () => {
    const { deps: d } = deps({
      directions: [
        { travel_mode: 'Driving', formatted_duration: '26 min', duration: 1579 },
        { travel_mode: 'Driving', formatted_duration: '31 min', duration: 1860 },
      ],
    })
    await expect(getTransferOptions('a', 'b', d)).resolves.toHaveLength(1)
  })

  /**
   * An empty answer is almost always a bad question — a name that would not geocode, a blip, a
   * timeout — rather than a journey with no route. Holding one for a day meant a single unlucky
   * moment left the plan insisting there was no way to get somewhere for the rest of the trip.
   */
  it('does not hold on to an empty answer', async () => {
    const { calls, deps: d } = deps({})
    await getTransferOptions('a', 'b', d)
    await getTransferOptions('a', 'b', d)
    expect(calls).toHaveLength(2)
  })

  it('does hold on to a real one', async () => {
    const { calls, deps: d } = deps()
    await getTransferOptions('a', 'b', d)
    await getTransferOptions('a', 'b', d)
    expect(calls).toHaveLength(1)
  })
})

/**
 * The failure this exists for: the plan said "no route came back", the traveler tapped Directions,
 * and Google Maps showed four. Nothing was wrong with the journey — the question was. A stay whose
 * provider address is only "Apartamentos X, Spain" does not geocode, and one unresolvable end
 * returns empty with no error to tell it apart from a genuinely routeless leg.
 */
describe('findTransferOptions', () => {
  /**
   * `asked` records only the journeys, never the geocode lookups behind them.
   *
   * The two are different questions on the same fake. Counting them together would make every
   * assertion about "how many descriptions did we pay for" quietly include the last-resort geocode,
   * and the point of those assertions is the directions calls.
   */
  function tries(answers: Record<string, unknown>, places: Record<string, unknown> = {}) {
    const asked: string[] = []
    const geocoded: string[] = []
    return {
      asked,
      geocoded,
      deps: {
        cache: createInMemoryCache(),
        search: async <T,>(engine: string, params: Record<string, unknown>): Promise<T> => {
          if (engine === 'google_maps') {
            const q = String(params.q)
            geocoded.push(q)
            return (places[q] ?? {}) as T
          }
          const shape = `${params.from}→${params.to}`
          asked.push(shape)
          return (answers[shape] ?? {}) as T
        },
      },
    }
  }


  it('answers from the first description that routes', async () => {
    const { asked, deps } = tries({
      'FCO airport→Apartamentos X, Spain': {},
      'FCO airport→41.9,12.49': { travel_modes: [{ travel_mode: 'Driving', formatted_duration: '38 min' }] },
    })
    const options = await findTransferOptions(
      [
        { from: 'FCO airport', to: 'Apartamentos X, Spain' },
        { from: 'FCO airport', to: '41.9,12.49' },
      ],
      deps,
    )
    expect(options).toEqual([{ mode: 'Driving', duration: '38 min' }])
    expect(asked).toHaveLength(2)
  })

  it('stops as soon as one works, so a good journey costs one call', async () => {
    const { asked, deps } = tries({
      'a→b': { travel_modes: [{ travel_mode: 'Driving', formatted_duration: '5 min' }] },
    })
    await findTransferOptions([{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }], deps)
    expect(asked).toEqual(['a→b'])
  })

  it('tries the next description when one of them throws', async () => {
    const search = vi
      .fn()
      .mockRejectedValueOnce(new Error('timed out'))
      .mockResolvedValueOnce({ travel_modes: [{ travel_mode: 'Transit', formatted_duration: '44 min' }] })
    const options = await findTransferOptions(
      [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }],
      { cache: createInMemoryCache(), search },
    )
    expect(options).toEqual([{ mode: 'Transit', duration: '44 min' }])
  })

  it('never pays for the same description twice', async () => {
    const { asked, deps } = tries({})
    await findTransferOptions([{ from: 'a', to: 'b' }, { from: 'a', to: 'b' }], deps)
    expect(asked).toEqual(['a→b'])
  })

  it('gives up rather than working through an unbounded list', async () => {
    const { asked, deps } = tries({})
    await findTransferOptions(
      Array.from({ length: 12 }, (_, i) => ({ from: 'a', to: `b${i}` })),
      deps,
    )
    expect(asked).toHaveLength(3)
  })

  it('answers with nothing when every description came back empty', async () => {
    const { deps } = tries({})
    await expect(
      findTransferOptions([{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }], deps),
    ).resolves.toEqual([])
  })

  it('skips a description that routes somewhere to itself', async () => {
    const { asked, deps } = tries({})
    await findTransferOptions([{ from: 'Hotel X', to: 'hotel x' }], deps)
    expect(asked).toEqual([])
  })
})

/**
 * The last resort, and the one that finally answers the airport run.
 *
 * "Tenerife South Airport" is not a point — it is a campus with arrivals, departures and terminals,
 * and Maps stops to ask which you meant rather than routing. That is the step the traveler was being
 * made to do by hand. A latitude and longitude has nothing left to ask about, so both ends are looked
 * up and the journey is asked once more as point to point.
 */
describe('findTransferRoute — asking as coordinates when no name will do', () => {
  function tries(answers: Record<string, unknown>, places: Record<string, unknown> = {}) {
    const asked: string[] = []
    return {
      asked,
      deps: {
        cache: createInMemoryCache(),
        search: async <T,>(engine: string, params: Record<string, unknown>): Promise<T> => {
          if (engine === 'google_maps') return (places[String(params.q)] ?? {}) as T
          const shape = `${params.from}→${params.to}`
          asked.push(shape)
          return (answers[shape] ?? {}) as T
        },
      },
    }
  }

  function at(lat: number, lng: number) {
    return {
      local_results: [
        { title: 'x', place_id: 'p', gps_coordinates: { latitude: lat, longitude: lng } },
      ],
    }
  }

  const driving = { travel_modes: [{ travel_mode: 'Driving', formatted_duration: '31 min' }] }

  it('routes the journey the names could not', async () => {
    const { asked, deps } = tries(
      { '28.04,-16.57→28.41,-16.54': driving },
      { 'Tenerife South Airport': at(28.04, -16.57), 'Apartamentos X, Spain': at(28.41, -16.54) },
    )
    const route = await findTransferRoute(
      [{ from: 'Tenerife South Airport', to: 'Apartamentos X, Spain' }],
      deps,
    )
    expect(route.options).toEqual([{ mode: 'Driving', duration: '31 min' }])
    // The named attempt first, then the same journey as two points.
    expect(asked).toEqual([
      'Tenerife South Airport→Apartamentos X, Spain',
      '28.04,-16.57→28.41,-16.54',
    ])
  })

  /** The endpoints are the link the card opens, so they must be the ones that actually worked. */
  it('reports the coordinates it used, so Directions opens the routed journey', async () => {
    const { deps } = tries(
      { '28.04,-16.57→28.41,-16.54': driving },
      { 'Tenerife South Airport': at(28.04, -16.57), 'Apartamentos X, Spain': at(28.41, -16.54) },
    )
    const route = await findTransferRoute(
      [{ from: 'Tenerife South Airport', to: 'Apartamentos X, Spain' }],
      deps,
    )
    expect(route).toMatchObject({ from: '28.04,-16.57', to: '28.41,-16.54' })
  })

  it('reports the name that worked when a name was enough', async () => {
    const { deps } = tries({ 'a→b': driving })
    await expect(findTransferRoute([{ from: 'a', to: 'b' }], deps)).resolves.toMatchObject({
      from: 'a',
      to: 'b',
    })
  })

  it('does not ask again when neither end can be placed', async () => {
    const { asked, deps } = tries({})
    const route = await findTransferRoute([{ from: 'Nowhere', to: 'Nowhere else' }], deps)
    expect(route.options).toEqual([])
    expect(asked).toEqual(['Nowhere→Nowhere else'])
  })

  /*
   * The coordinates were already tried as one of the plan's own alternates. Asking the identical
   * journey a second time is a provider call spent to be told the same thing.
   */
  it('does not re-ask a point-to-point journey it already tried', async () => {
    const { asked, deps } = tries(
      {},
      { 'Hotel X': at(41.9, 12.49), 'FCO airport': at(41.8, 12.25) },
    )
    await findTransferRoute(
      [
        { from: 'FCO airport', to: 'Hotel X' },
        { from: '41.8,12.25', to: '41.9,12.49' },
      ],
      deps,
    )
    expect(asked).toEqual(['FCO airport→Hotel X', '41.8,12.25→41.9,12.49'])
  })
})
