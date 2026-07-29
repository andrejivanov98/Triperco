import { describe, it, expect } from 'vitest'
import { searchFlights, searchFlightsFlexible, searchMultiCity, MAX_FLEX_DAYS } from './search'
import { createInMemoryCache } from './cache'
import type { SearchParams } from './client'

/** Records every call the code makes, and answers with one flight per request. */
function recorder(priceByDate: Record<string, number> = {}) {
  const calls: { engine: string; params: SearchParams }[] = []
  const search = async <T,>(engine: string, params: SearchParams): Promise<T> => {
    calls.push({ engine, params })
    const date = String(params.outbound_date ?? 'multi')
    return {
      best_flights: [
        {
          flights: [
            {
              departure_airport: { id: 'SKP', time: `${date} 08:00` },
              arrival_airport: { id: 'FCO', time: `${date} 10:00` },
              airline: 'ITA',
              flight_number: `AZ${date.slice(-2)}`,
              duration: 120,
            },
          ],
          price: priceByDate[date] ?? 200,
          total_duration: 120,
          type: 'One way',
        },
      ],
    } as T
  }
  return { calls, deps: { search, cache: createInMemoryCache() } }
}

describe('searchFlights — cabin, stops and party', () => {
  it('passes the provider the values it actually accepts', async () => {
    const { calls, deps } = recorder()
    await searchFlights(
      {
        departure_id: 'SKP',
        arrival_id: 'FCO',
        outbound_date: '2026-09-10',
        travel_class: 'business',
        stops: 'nonstop',
        adults: 2,
        children: 1,
        infants_in_seat: 1,
        infants_on_lap: 1,
      },
      deps,
    )
    expect(calls[0].params).toMatchObject({
      travel_class: 'business',
      stops: 'nonstop',
      adults: 2,
      children: 1,
      infants_in_seat: 1,
      infants_on_lap: 1,
    })
  })

  it('does not let a cabin change reuse the cached economy result', async () => {
    const { calls, deps } = recorder()
    const base = { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' } as const
    await searchFlights({ ...base }, deps)
    await searchFlights({ ...base, travel_class: 'business' }, deps)
    expect(calls).toHaveLength(2)
  })
})

describe('searchFlightsFlexible', () => {
  it('searches the named date only when there is no flexibility', async () => {
    const { calls, deps } = recorder()
    await searchFlightsFlexible(
      { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' },
      0,
      deps,
    )
    expect(calls).toHaveLength(1)
  })

  it('looks either side of the date and merges the results', async () => {
    const { calls, deps } = recorder({ '2026-09-08': 120, '2026-09-10': 200, '2026-09-12': 260 })
    const flights = await searchFlightsFlexible(
      { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' },
      2,
      deps,
    )
    expect(calls.map((c) => c.params.outbound_date)).toEqual([
      '2026-09-08',
      '2026-09-10',
      '2026-09-12',
    ])
    // One set, so the existing ranking can float the cheapest date to the front.
    expect(flights).toHaveLength(3)
    expect(Math.min(...flights.map((f) => f.price))).toBe(120)
  })

  it('shifts the whole trip together so the stay never changes length', async () => {
    const { calls, deps } = recorder()
    await searchFlightsFlexible(
      {
        departure_id: 'SKP',
        arrival_id: 'FCO',
        outbound_date: '2026-09-10',
        return_date: '2026-09-17',
        flight_type: 'round_trip',
      },
      1,
      deps,
    )
    const pairs = calls
      .filter((c) => c.params.outbound_date)
      .map((c) => [c.params.outbound_date, c.params.return_date])
    expect(pairs).toContainEqual(['2026-09-09', '2026-09-16'])
    expect(pairs).toContainEqual(['2026-09-11', '2026-09-18'])
  })

  it('refuses to wander further than a few days', async () => {
    const { calls, deps } = recorder()
    await searchFlightsFlexible(
      { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' },
      99,
      deps,
    )
    const dates = calls.map((c) => String(c.params.outbound_date)).sort()
    const earliest = String(10 - MAX_FLEX_DAYS).padStart(2, '0')
    expect(dates[0]).toBe(`2026-09-${earliest}`)
    expect(dates.at(-1)).toBe(`2026-09-${10 + MAX_FLEX_DAYS}`)
  })

  it('still returns what it found when one date fails', async () => {
    let n = 0
    const deps = {
      cache: createInMemoryCache(),
      search: async <T,>(): Promise<T> => {
        n += 1
        if (n === 1) throw new Error('provider hiccup')
        return { best_flights: [] } as T
      },
    }
    await expect(
      searchFlightsFlexible(
        { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' },
        1,
        deps,
      ),
    ).resolves.toEqual([])
  })
})

describe('searchMultiCity', () => {
  it('sends the whole journey as one payload', async () => {
    const { calls, deps } = recorder()
    await searchMultiCity(
      {
        legs: [
          { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' },
          { departure_id: 'FCO', arrival_id: 'BCN', outbound_date: '2026-09-14' },
        ],
        travel_class: 'economy',
      },
      deps,
    )
    expect(calls[0].params.flight_type).toBe('multi_city')
    // The provider wants outbound_date on each segment, not date.
    expect(JSON.parse(String(calls[0].params.multi_city_json))).toEqual([
      { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' },
      { departure_id: 'FCO', arrival_id: 'BCN', outbound_date: '2026-09-14' },
    ])
  })

  it('does not call the provider for a journey that is not multi-city', async () => {
    const { calls, deps } = recorder()
    await expect(
      searchMultiCity(
        { legs: [{ departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' }] },
        deps,
      ),
    ).resolves.toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('drops an incomplete leg rather than sending rubbish', async () => {
    const { calls, deps } = recorder()
    await searchMultiCity(
      {
        legs: [
          { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-09-10' },
          { departure_id: 'FCO', arrival_id: '', outbound_date: '2026-09-14' },
        ],
      },
      deps,
    )
    expect(calls).toHaveLength(0)
  })
})
