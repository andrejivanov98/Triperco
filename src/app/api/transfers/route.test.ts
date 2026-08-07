import { describe, it, expect, vi, beforeEach } from 'vitest'

const findTransferRoute = vi.fn()

vi.mock('@/lib/searchapi/search', async () => {
  const actual = await vi.importActual<typeof import('@/lib/searchapi/search')>(
    '@/lib/searchapi/search',
  )
  return {
    MAX_TRANSFER_ATTEMPTS: actual.MAX_TRANSFER_ATTEMPTS,
    findTransferRoute: (candidates: unknown, deps?: unknown) =>
      findTransferRoute(candidates, deps),
  }
})
vi.mock('@/lib/rate/limit', () => ({
  checkRateLimit: async () => ({ ok: true }),
  tooManyRequests: () => new Response('slow down', { status: 429 }),
}))

const { POST } = await import('./route')

function post(body: unknown): Promise<Response> {
  return POST(
    new Request('https://triperco.test/api/transfers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

const leg = (key: string) => ({ key, from: 'MEX airport', to: 'Hotel One, Cancun' })

/** A routed answer, carrying the naming that worked — which is usually a pair of coordinates. */
const routed = {
  options: [{ mode: 'Driving', duration: '27 min' }],
  from: '21.03,-86.87',
  to: '21.16,-86.85',
}

beforeEach(() => {
  findTransferRoute.mockReset()
  findTransferRoute.mockResolvedValue(routed)
})

describe('POST /api/transfers', () => {
  it('prices each leg and keys the answer by the caller’s own key', async () => {
    const body = (await (await post({ legs: [leg('arrive:1:2')] })).json()) as {
      legs: Record<string, unknown[]>
    }
    expect(body.legs['arrive:1:2']).toEqual([{ mode: 'Driving', duration: '27 min' }])
  })

  it('rejects a body with no legs', async () => {
    expect((await post({})).status).toBe(400)
    expect((await post({ legs: [] })).status).toBe(400)
  })

  it('rejects a malformed body', async () => {
    const res = await POST(
      new Request('https://triperco.test/api/transfers', { method: 'POST', body: '{oops' }),
    )
    expect(res.status).toBe(400)
  })

  /**
   * Each leg is a paid provider call, so the cap is what stops one crafted request fanning out.
   */
  it('prices no more than one plan’s worth of legs', async () => {
    await post({ legs: Array.from({ length: 40 }, (_, i) => leg(`k${i}`)) })
    expect(findTransferRoute).toHaveBeenCalledTimes(8)
  })

  it('drops a leg naming somewhere absurdly long rather than passing it on', async () => {
    const res = await post({ legs: [{ ...leg('k'), to: 'x'.repeat(5_000) }] })
    expect(res.status).toBe(400)
    expect(findTransferRoute).not.toHaveBeenCalled()
  })

  it('ignores entries that are not legs at all', async () => {
    const res = await post({ legs: [null, 'nope', { key: 'k' }, leg('good')] })
    expect(res.status).toBe(200)
    expect(findTransferRoute).toHaveBeenCalledTimes(1)
  })

  /** Five journeys shown beats none: one failing leg must not take the request down with it. */
  it('answers with an empty list for a leg the provider could not route', async () => {
    findTransferRoute.mockRejectedValueOnce(new Error('provider down'))
    const body = (await (await post({ legs: [leg('a'), leg('b')] })).json()) as {
      legs: Record<string, unknown[]>
    }
    expect(body.legs.a).toEqual([])
    expect(body.legs.b).toHaveLength(1)
  })

  /*
   * The endpoints are not decoration. The description that finally routed is usually a pair of
   * coordinates rather than the name the plan shows, and it is what lets the card's Directions link
   * open the journey that worked instead of the airport name that made Maps ask about terminals.
   */
  it('reports how each journey was finally named', async () => {
    const body = (await (await post({ legs: [leg('arrive:1:2')] })).json()) as {
      endpoints: Record<string, { from: string; to: string }>
    }
    expect(body.endpoints['arrive:1:2']).toEqual({ from: '21.03,-86.87', to: '21.16,-86.85' })
  })

  it('falls back to the names it was given when the lookup failed outright', async () => {
    findTransferRoute.mockRejectedValueOnce(new Error('provider down'))
    const body = (await (await post({ legs: [leg('a')] })).json()) as {
      endpoints: Record<string, { from: string; to: string }>
    }
    expect(body.endpoints.a).toEqual({ from: 'MEX airport', to: 'Hotel One, Cancun' })
  })
})

/**
 * A name a geocoder cannot place comes back the same way a routeless journey does: empty, with no
 * error. That is how the plan came to claim there was no way to get somewhere the traveler could
 * then route in Google Maps in one tap. Every end is describable more than one way, and the caller
 * sends those descriptions along.
 */
describe('POST /api/transfers — other ways of naming a journey', () => {
  it('passes each description on, best first', async () => {
    await post({
      legs: [
        {
          key: 'k',
          from: 'FCO airport',
          to: 'Apartamentos X, Spain',
          toAlternates: ['41.9,12.49', 'Calle Real 3, Madrid'],
        },
      ],
    })
    expect(findTransferRoute).toHaveBeenCalledWith(
      [
        { from: 'FCO airport', to: 'Apartamentos X, Spain' },
        { from: 'FCO airport', to: '41.9,12.49' },
        { from: 'FCO airport', to: 'Calle Real 3, Madrid' },
      ],
      undefined,
    )
  })

  it('drops an alternate that is not usable rather than the whole leg', async () => {
    await post({
      legs: [{ ...leg('k'), toAlternates: [42, '', 'x'.repeat(5_000), 'Calle Real 3, Madrid'] }],
    })
    const [candidates] = findTransferRoute.mock.calls[0] as [{ to: string }[]]
    expect(candidates.map((c) => c.to)).toEqual(['Hotel One, Cancun', 'Calle Real 3, Madrid'])
  })

  it('is happy with a leg that offers no alternates at all', async () => {
    await post({ legs: [leg('k')] })
    expect(findTransferRoute).toHaveBeenCalledWith(
      [{ from: 'MEX airport', to: 'Hotel One, Cancun' }],
      undefined,
    )
  })
})
