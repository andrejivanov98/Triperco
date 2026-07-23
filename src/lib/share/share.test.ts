import { describe, it, expect } from 'vitest'
import {
  serializeTrip,
  deserializeTrip,
  newTripId,
  createInMemoryTripStore,
} from './share'
import { createTrip, addFlight } from '../trip/tripState'
import type { Flight } from '../trip/types'

const flight: Flight = {
  id: 'f1',
  from: 'SKP',
  to: 'FCO',
  stops: 0,
  price: 180,
  bookUrl: 'https://air',
}

describe('serialize/deserialize', () => {
  it('round-trips a trip', () => {
    const trip = addFlight(createTrip('t1'), flight)
    const restored = deserializeTrip(serializeTrip(trip))
    expect(restored).toEqual(trip)
  })

  it('throws on malformed payloads', () => {
    expect(() => deserializeTrip('{"nope":true}')).toThrow()
  })
})

describe('newTripId', () => {
  it('returns a non-empty unique string', () => {
    const a = newTripId()
    const b = newTripId()
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
  })
})

describe('createInMemoryTripStore', () => {
  it('saves and loads a trip by id', async () => {
    const store = createInMemoryTripStore()
    const trip = addFlight(createTrip('t1'), flight)
    const id = await store.save(trip)
    expect(id).toBe('t1')
    expect(await store.load('t1')).toEqual(trip)
  })

  it('returns null for a missing id', async () => {
    const store = createInMemoryTripStore()
    expect(await store.load('missing')).toBeNull()
  })
})
