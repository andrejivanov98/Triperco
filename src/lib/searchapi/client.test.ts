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
})
