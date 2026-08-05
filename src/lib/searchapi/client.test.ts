import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchApi } from './client'

afterEach(() => {
  vi.unstubAllEnvs()
})

function fakeFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as Response) as unknown as typeof fetch
}

describe('searchApi', () => {
  it('calls the endpoint with engine + params and returns parsed JSON', async () => {
    let calledUrl = ''
    const fetchImpl = (async (url: string) => {
      calledUrl = url
      return { ok: true, status: 200, json: async () => ({ ok: 1 }) } as Response
    }) as unknown as typeof fetch

    const res = await searchApi<{ ok: number }>(
      'google_maps',
      { q: 'Rome', ll: '@41.9,12.5,12z' },
      { apiKey: 'k', fetchImpl },
    )

    expect(res.ok).toBe(1)
    expect(calledUrl).toContain('engine=google_maps')
    expect(calledUrl).toContain('q=Rome')
    expect(calledUrl).toContain('ll=')
  })

  it('throws on a non-2xx response', async () => {
    await expect(
      searchApi('google_maps', { q: 'x' }, { apiKey: 'k', fetchImpl: fakeFetch(429, {}) }),
    ).rejects.toThrow(/429/)
  })

  it("includes the provider's reason so the agent can correct itself", async () => {
    await expect(
      searchApi(
        'google_hotels',
        { q: 'x' },
        {
          apiKey: 'k',
          fetchImpl: fakeFetch(400, { error: 'check_in_date value cannot be earlier than today.' }),
        },
      ),
    ).rejects.toThrow(/cannot be earlier than today/)
  })

  it('throws when no api key is available', async () => {
    vi.stubEnv('SEARCHAPI_API_KEY', '')
    await expect(
      searchApi('google_maps', { q: 'x' }, { fetchImpl: fakeFetch(200, {}) }),
    ).rejects.toThrow(/SEARCHAPI_API_KEY/)
  })

  it('omits undefined params', async () => {
    let calledUrl = ''
    const fetchImpl = (async (url: string) => {
      calledUrl = url
      return { ok: true, status: 200, json: async () => ({}) } as Response
    }) as unknown as typeof fetch

    await searchApi('google_flights', { departure_id: 'SKP', arrival_id: undefined }, { apiKey: 'k', fetchImpl })
    expect(calledUrl).toContain('departure_id=SKP')
    expect(calledUrl).not.toContain('arrival_id')
  })

  it('never puts the api key in the url, where it could be logged', async () => {
    let calledUrl = ''
    let headers: Record<string, string> = {}
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calledUrl = url
      headers = init.headers as Record<string, string>
      return { ok: true, status: 200, json: async () => ({}) } as Response
    }) as unknown as typeof fetch

    await searchApi('google_maps', { q: 'Rome' }, { apiKey: 'secret-key', fetchImpl })
    expect(calledUrl).not.toContain('secret-key')
    expect(headers.Authorization).toBe('Bearer secret-key')
  })
})

/**
 * One transient failure should not cost the traveler a whole search. A 5xx or a timeout is worth a
 * second attempt; a 4xx is the provider telling us the parameters are wrong, and repeating it would
 * just burn quota to be told the same thing.
 */
describe('searchApi — retrying what is worth retrying', () => {
  /** Answers with the given statuses in order, so a retry gets a different outcome. */
  function sequence(...statuses: (number | 'network')[]): { calls: () => number; fetchImpl: typeof fetch } {
    let call = 0
    const fetchImpl = (async () => {
      const status = statuses[Math.min(call, statuses.length - 1)]
      call += 1
      if (status === 'network') throw new Error('socket hang up')
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => ({ ok: status === 200 ? 1 : 0 }),
      } as Response
    }) as unknown as typeof fetch
    return { calls: () => call, fetchImpl }
  }

  it('retries a 500 once and returns the successful second answer', async () => {
    const { calls, fetchImpl } = sequence(500, 200)
    const res = await searchApi<{ ok: number }>('google_maps', { q: 'x' }, { apiKey: 'k', fetchImpl })
    expect(res.ok).toBe(1)
    expect(calls()).toBe(2)
  })

  it('retries a dropped connection once', async () => {
    const { calls, fetchImpl } = sequence('network', 200)
    const res = await searchApi<{ ok: number }>('google_maps', { q: 'x' }, { apiKey: 'k', fetchImpl })
    expect(res.ok).toBe(1)
    expect(calls()).toBe(2)
  })

  it('gives up after one retry rather than hammering the provider', async () => {
    const { calls, fetchImpl } = sequence(500, 500, 500)
    await expect(
      searchApi('google_maps', { q: 'x' }, { apiKey: 'k', fetchImpl }),
    ).rejects.toThrow(/500/)
    expect(calls()).toBe(2)
  })

  it('does not retry a 400 — the parameters are wrong and will stay wrong', async () => {
    const { calls, fetchImpl } = sequence(400, 200)
    await expect(
      searchApi('google_maps', { q: 'x' }, { apiKey: 'k', fetchImpl }),
    ).rejects.toThrow(/400/)
    expect(calls()).toBe(1)
  })

  it('does not retry a 429 — retrying immediately is the one thing that cannot help', async () => {
    const { calls, fetchImpl } = sequence(429, 200)
    await expect(
      searchApi('google_maps', { q: 'x' }, { apiKey: 'k', fetchImpl }),
    ).rejects.toThrow(/too many requests|rate limit/i)
    expect(calls()).toBe(1)
  })

  it('says "rate limited" on a 429 so the agent can tell it apart from a bad parameter', async () => {
    await expect(
      searchApi('google_maps', { q: 'x' }, { apiKey: 'k', fetchImpl: fakeFetch(429, {}) }),
    ).rejects.toThrow(/rate limit/i)
  })
})
