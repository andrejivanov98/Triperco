import { describe, it, expect, vi, beforeEach } from 'vitest'

const getTransferOptions = vi.fn()

vi.mock('@/lib/searchapi/search', () => ({
  getTransferOptions: (from: string, to: string, deps?: unknown) =>
    getTransferOptions(from, to, deps),
}))
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

beforeEach(() => {
  getTransferOptions.mockReset()
  getTransferOptions.mockResolvedValue([{ mode: 'Driving', duration: '27 min' }])
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
    expect(getTransferOptions).toHaveBeenCalledTimes(8)
  })

  it('drops a leg naming somewhere absurdly long rather than passing it on', async () => {
    const res = await post({ legs: [{ ...leg('k'), to: 'x'.repeat(5_000) }] })
    expect(res.status).toBe(400)
    expect(getTransferOptions).not.toHaveBeenCalled()
  })

  it('ignores entries that are not legs at all', async () => {
    const res = await post({ legs: [null, 'nope', { key: 'k' }, leg('good')] })
    expect(res.status).toBe(200)
    expect(getTransferOptions).toHaveBeenCalledTimes(1)
  })

  /** Five journeys shown beats none: one failing leg must not take the request down with it. */
  it('answers with an empty list for a leg the provider could not route', async () => {
    getTransferOptions.mockRejectedValueOnce(new Error('provider down'))
    const body = (await (await post({ legs: [leg('a'), leg('b')] })).json()) as {
      legs: Record<string, unknown[]>
    }
    expect(body.legs.a).toEqual([])
    expect(body.legs.b).toHaveLength(1)
  })
})
