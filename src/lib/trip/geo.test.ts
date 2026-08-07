import { describe, it, expect } from 'vitest'
import { haversineKm, isRealPoint, partitionNear, asBias, STAY_RADIUS_KM } from './geo'

const barcelona = { lat: 41.3874, lng: 2.1686 }
const sitges = { lat: 41.2371, lng: 1.8055 } // 35 km down the coast — same trip.
const madrid = { lat: 40.4168, lng: -3.7038 } // 500 km away — a different trip.
const newYork = { lat: 40.7128, lng: -74.006 } // the reported bug, in one line.

describe('haversineKm', () => {
  it('is zero for a point and itself', () => {
    expect(haversineKm(barcelona, barcelona)).toBe(0)
  })

  it('measures a real distance to within a few kilometres', () => {
    expect(haversineKm(barcelona, madrid)).toBeGreaterThan(490)
    expect(haversineKm(barcelona, madrid)).toBeLessThan(520)
  })

  it('does not care which way round it is asked', () => {
    expect(haversineKm(barcelona, madrid)).toBeCloseTo(haversineKm(madrid, barcelona), 6)
  })
})

describe('isRealPoint', () => {
  it('accepts coordinates a place can actually occupy', () => {
    expect(isRealPoint(barcelona)).toBe(true)
  })

  it('rejects nothing at all', () => {
    expect(isRealPoint(undefined)).toBe(false)
  })

  /** 0,0 is in the Gulf of Guinea. In a provider payload it is a missing value, not a location. */
  it('rejects the null island', () => {
    expect(isRealPoint({ lat: 0, lng: 0 })).toBe(false)
  })

  it('rejects coordinates off the planet', () => {
    expect(isRealPoint({ lat: 91, lng: 0 })).toBe(false)
    expect(isRealPoint({ lat: 0, lng: 181 })).toBe(false)
    expect(isRealPoint({ lat: Number.NaN, lng: 2 })).toBe(false)
  })
})

/**
 * The fence that stops a Barcelona trip being shown American hotels.
 *
 * Asked for somewhere to stay in Barcelona, the planner rendered stays in the United States: the
 * provider's engines resolve a query with no locality against their own default. This is the half of
 * the fix that works regardless of how the question was phrased.
 */
describe('partitionNear', () => {
  const results = [
    { id: 'near', coords: barcelona },
    { id: 'day-trip', coords: sitges },
    { id: 'wrong-country', coords: newYork },
  ]

  it('keeps what is at the destination and separates what is not', () => {
    const { near, far } = partitionNear(results, barcelona, STAY_RADIUS_KM)
    expect(near.map((r) => r.id)).toEqual(['near', 'day-trip'])
    expect(far.map((r) => r.id)).toEqual(['wrong-country'])
  })

  /**
   * A result with no location is kept. The fence removes what is *provably* elsewhere; asking a
   * listing to prove it belongs would drop plenty of real ones for a field the provider omitted.
   */
  it('keeps a result the provider gave no coordinates for', () => {
    const unplaced = [{ id: 'unplaced', coords: undefined }]
    const { near, far } = partitionNear(unplaced, barcelona, STAY_RADIUS_KM)
    expect(near.map((r) => r.id)).toEqual(['unplaced'])
    expect(far).toEqual([])
  })

  it('fences nothing when the destination itself could not be placed', () => {
    for (const centre of [null, undefined, { lat: 0, lng: 0 }]) {
      const { near, far } = partitionNear(results, centre, STAY_RADIUS_KM)
      expect(near).toHaveLength(3)
      expect(far).toEqual([])
    }
  })

  it('honours the radius it is given rather than one of its own', () => {
    const { far } = partitionNear(results, barcelona, 10)
    expect(far.map((r) => r.id)).toEqual(['day-trip', 'wrong-country'])
  })
})

describe('asBias', () => {
  it('writes the bias in the shape the maps engine takes', () => {
    expect(asBias(barcelona)).toBe('@41.3874,2.1686,12z')
    expect(asBias(barcelona, 14)).toBe('@41.3874,2.1686,14z')
  })
})
