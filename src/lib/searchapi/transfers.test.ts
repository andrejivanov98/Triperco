import { describe, it, expect } from 'vitest'
import { getTransferOptions } from './search'
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
})
