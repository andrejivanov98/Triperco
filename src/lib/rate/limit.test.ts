import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkRateLimit, clientKey, tooManyRequests } from './limit'

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

const req = (headers: Record<string, string> = {}) =>
  new Request('https://triperco.vercel.app/api/chat', { method: 'POST', headers })

describe('clientKey', () => {
  it('takes the real client, not the proxy hops behind it', () => {
    // Vercel puts the caller first; everything after is infrastructure.
    expect(clientKey(req({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }))).toBe(
      '203.0.113.7',
    )
  })

  it('falls back to x-real-ip', () => {
    expect(clientKey(req({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4')
  })

  it('buckets unidentifiable callers together rather than exempting them', () => {
    // "unknown" is a shared bucket: a request we cannot place still cannot run free.
    expect(clientKey(req())).toBe('unknown')
  })
})

describe('checkRateLimit — fails open', () => {
  it('allows the request when Redis is not configured', async () => {
    // Local development has no Redis; the app must still work.
    await expect(checkRateLimit(req(), 'chat')).resolves.toMatchObject({ ok: true })
  })

  it('allows the request when Redis is configured but unreachable', async () => {
    // A limiter that takes the site down when its store hiccups is worse than the abuse it stops.
    process.env.KV_REST_API_URL = 'https://127.0.0.1:1'
    process.env.KV_REST_API_TOKEN = 'nope'
    await expect(checkRateLimit(req(), 'chat')).resolves.toMatchObject({ ok: true })
  }, 20_000)
})

describe('tooManyRequests', () => {
  it('says when to come back, in the header and the body', async () => {
    const res = tooManyRequests(42)
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('42')
    await expect(res.json()).resolves.toMatchObject({ retryAfter: 42 })
  })

  it('is readable rather than a bare status', async () => {
    const body = (await tooManyRequests(5).json()) as { error: string }
    expect(body.error).toMatch(/try again/i)
  })
})
