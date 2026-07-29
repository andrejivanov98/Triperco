import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getTripStore } from './tripStore'

const KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
] as const

const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
})
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

/**
 * Provisioning Upstash through the Vercel Marketplace writes KV_REST_API_* rather than the
 * UPSTASH_REDIS_REST_* names in Upstash's own docs. Reading only one set means shared links quietly
 * fall back to memory — which looks fine until a link is opened an hour later and 404s.
 */
describe('getTripStore — credential discovery', () => {
  it('uses Redis when Upstash names its own variables', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    expect(getTripStore()).not.toBe(getTripStore())
  })

  it('uses Redis when Vercel names them instead', () => {
    process.env.KV_REST_API_URL = 'https://example.upstash.io'
    process.env.KV_REST_API_TOKEN = 'token'
    expect(getTripStore()).not.toBe(getTripStore())
  })

  it('falls back to memory when neither pair is complete', () => {
    process.env.KV_REST_API_URL = 'https://example.upstash.io'
    // No token: half a credential is not a credential.
    const store = getTripStore()
    expect(store).toBe(getTripStore())
  })
})
