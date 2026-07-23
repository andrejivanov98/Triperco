import { describe, it, expect } from 'vitest'
import { createInMemoryCache, withCache } from './cache'

describe('createInMemoryCache', () => {
  it('stores and retrieves a value', async () => {
    const cache = createInMemoryCache()
    await cache.set('k', { a: 1 }, 60)
    expect(await cache.get<{ a: number }>('k')).toEqual({ a: 1 })
  })

  it('returns null for a missing key', async () => {
    const cache = createInMemoryCache()
    expect(await cache.get('nope')).toBeNull()
  })

  it('expires values after the TTL using the injected clock', async () => {
    let clock = 1000
    const cache = createInMemoryCache(() => clock)
    await cache.set('k', 'v', 10) // expires at 1000 + 10_000
    clock = 10_999
    expect(await cache.get('k')).toBe('v')
    clock = 11_001
    expect(await cache.get('k')).toBeNull()
  })
})

describe('withCache', () => {
  it('runs fn on miss, serves cache on hit', async () => {
    const cache = createInMemoryCache()
    let calls = 0
    const run = () =>
      withCache(cache, 'k', 60, async () => {
        calls += 1
        return 'result'
      })
    expect(await run()).toBe('result')
    expect(await run()).toBe('result')
    expect(calls).toBe(1) // second call served from cache
  })
})
