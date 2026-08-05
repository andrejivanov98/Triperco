import { describe, it, expect } from 'vitest'
import {
  serializeTrip,
  deserializeTrip,
  newTripId,
  createInMemoryTripStore,
  newWriteToken,
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

/**
 * A share id is known to everyone holding the link, so it cannot also be the proof of who may
 * overwrite what is behind it. The token is that proof, and it lives apart from the trip.
 */
describe('write tokens', () => {
  it('mints a distinct token each time', () => {
    expect(newWriteToken()).not.toBe(newWriteToken())
    expect(newWriteToken().length).toBeGreaterThan(20)
  })

  it('remembers and returns a token for an id', async () => {
    const store = createInMemoryTripStore()
    await store.putToken('abc', 'secret')
    expect(await store.getToken('abc')).toBe('secret')
  })

  it('has no token for an id that was never given one', async () => {
    const store = createInMemoryTripStore()
    expect(await store.getToken('abc')).toBeNull()
  })

  it('never carries the token inside the trip it protects', async () => {
    const store = createInMemoryTripStore()
    const trip = { ...createTrip('abc') }
    await store.save(trip)
    await store.putToken('abc', 'secret')
    // Whatever a reader loads, the secret is not in it.
    expect(JSON.stringify(await store.load('abc'))).not.toContain('secret')
  })

  it('keeps tokens separate per trip', async () => {
    const store = createInMemoryTripStore()
    await store.putToken('a', 'token-a')
    await store.putToken('b', 'token-b')
    expect(await store.getToken('a')).toBe('token-a')
    expect(await store.getToken('b')).toBe('token-b')
  })
})
