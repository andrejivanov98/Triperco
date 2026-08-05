import { describe, it, expect } from 'vitest'
import { createRedisTripStore } from './tripStore'
import { createTrip, setMeta } from '../trip/tripState'

// Fake Upstash-like client: set stores the value as-is (objects stay objects),
// get returns it or null — mirroring @upstash/redis auto-(de)serialization.
function fakeRedis() {
  const map = new Map<string, unknown>()
  return {
    map,
    async get(key: string) {
      return map.has(key) ? map.get(key) : null
    },
    async set(key: string, value: unknown) {
      map.set(key, value)
    },
  }
}

describe('createRedisTripStore', () => {
  it('saves under a trip:{id} key and loads it back', async () => {
    const redis = fakeRedis()
    const store = createRedisTripStore(redis)
    const trip = setMeta(createTrip('abc'), { destination: 'Rome' })

    const id = await store.save(trip)
    expect(id).toBe('abc')
    expect(redis.map.has('trip:abc')).toBe(true)

    const loaded = await store.load('abc')
    expect(loaded).toEqual(trip)
  })

  it('returns null for a missing id', async () => {
    const store = createRedisTripStore(fakeRedis())
    expect(await store.load('nope')).toBeNull()
  })

  it('normalizes a JSON string value from redis', async () => {
    const redis = fakeRedis()
    const store = createRedisTripStore(redis)
    const trip = createTrip('str1')
    // Simulate a client that returns the raw JSON string.
    redis.map.set('trip:str1', JSON.stringify(trip))
    expect(await store.load('str1')).toEqual(trip)
  })
})

/**
 * Tokens live in their own keyspace. Nothing that reads a trip can reach one, which is what stops a
 * secret being serialized into a response by accident.
 */
describe('createRedisTripStore — write tokens', () => {
  it('stores a token under its own key, never inside the trip', async () => {
    const redis = fakeRedis()
    const store = createRedisTripStore(redis)
    await store.save(createTrip('abc'))
    await store.putToken('abc', 'secret')

    expect(redis.map.get('trip-token:abc')).toBe('secret')
    expect(JSON.stringify(redis.map.get('trip:abc'))).not.toContain('secret')
  })

  it('reads a token back', async () => {
    const store = createRedisTripStore(fakeRedis())
    await store.putToken('abc', 'secret')
    expect(await store.getToken('abc')).toBe('secret')
  })

  it('is null when there is no token for that id', async () => {
    const store = createRedisTripStore(fakeRedis())
    expect(await store.getToken('missing')).toBeNull()
  })

  it('gives a token the same lifetime as the trip it protects', async () => {
    const seen: { key: string; ex?: number }[] = []
    const redis = {
      map: new Map<string, unknown>(),
      async get() {
        return null
      },
      async set(key: string, _value: unknown, opts?: { ex?: number }) {
        seen.push({ key, ex: opts?.ex })
      },
    }
    const store = createRedisTripStore(redis)
    await store.save(createTrip('abc'))
    await store.putToken('abc', 'secret')
    // A token outliving its trip would protect nothing; one expiring first would strand the link.
    expect(seen[0].ex).toBe(seen[1].ex)
  })

  it('ignores a non-string token, rather than trusting whatever came back', async () => {
    const redis = fakeRedis()
    redis.map.set('trip-token:abc', { not: 'a string' })
    expect(await createRedisTripStore(redis).getToken('abc')).toBeNull()
  })
})
