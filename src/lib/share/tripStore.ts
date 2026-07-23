import { Redis } from '@upstash/redis'
import type { TripState } from '../trip/types'
import {
  type TripStore,
  serializeTrip,
  deserializeTrip,
  createInMemoryTripStore,
} from './share'

/** Minimal shape we need from an Upstash-like Redis client. */
export interface RedisLike {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>
}

const KEY_PREFIX = 'trip:'
const TTL_SECONDS = 60 * 60 * 24 * 90 // 90 days

/** A TripStore backed by an Upstash-like Redis client. */
export function createRedisTripStore(redis: RedisLike): TripStore {
  return {
    async save(trip: TripState): Promise<string> {
      await redis.set(`${KEY_PREFIX}${trip.id}`, trip, { ex: TTL_SECONDS })
      return trip.id
    },
    async load(id: string): Promise<TripState | null> {
      const raw = await redis.get(`${KEY_PREFIX}${id}`)
      if (raw == null) return null
      // Upstash may return a parsed object or a raw string depending on how it
      // was stored; normalize both through the validating deserializer.
      return deserializeTrip(typeof raw === 'string' ? raw : serializeTrip(raw as TripState))
    },
  }
}

// Memoized in-memory fallback so local dev sharing works within one server run.
let memoryStore: TripStore | null = null

/**
 * Returns the Upstash-backed store when its env vars are present, otherwise a
 * process-memoized in-memory store (non-persistent across restarts).
 */
export function getTripStore(): TripStore {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Redis.fromEnv() is only constructed when the env vars are present.
    return createRedisTripStore(Redis.fromEnv() as unknown as RedisLike)
  }
  if (!memoryStore) memoryStore = createInMemoryTripStore()
  return memoryStore
}
