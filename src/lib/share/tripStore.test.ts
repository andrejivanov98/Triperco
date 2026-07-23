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
