export interface Cache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
}

interface Entry {
  value: unknown
  expires: number
}

/** In-memory cache. `now` is injectable for deterministic TTL tests. */
export function createInMemoryCache(now: () => number = () => Date.now()): Cache {
  const store = new Map<string, Entry>()
  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key)
      if (!entry) return null
      if (now() > entry.expires) {
        store.delete(key)
        return null
      }
      return entry.value as T
    },
    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
      store.set(key, { value, expires: now() + ttlSeconds * 1000 })
    },
  }
}

export async function withCache<T>(
  cache: Cache,
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get<T>(key)
  if (cached !== null) return cached
  const fresh = await fn()
  await cache.set(key, fresh, ttlSeconds)
  return fresh
}
