import { describe, it, expect, vi, beforeEach } from 'vitest'

const getPlaceReviews = vi.fn()
const getPlacePhotos = vi.fn()

vi.mock('@/lib/searchapi/search', () => ({
  getPlaceReviews: (id: string, deps?: unknown) => getPlaceReviews(id, deps),
  getPlacePhotos: (id: string, deps?: unknown) => getPlacePhotos(id, deps),
}))
vi.mock('@/lib/rate/limit', () => ({
  checkRateLimit: async () => ({ ok: true }),
  tooManyRequests: () => new Response('slow down', { status: 429 }),
}))

const { POST } = await import('./route')

function post(body: unknown): Promise<Response> {
  return POST(
    new Request('https://triperco.test/api/places/details', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  getPlaceReviews.mockReset().mockResolvedValue([{ text: 'Lovely spot' }])
  getPlacePhotos.mockReset().mockResolvedValue(['https://photo/1'])
})

describe('POST /api/places/details — one place', () => {
  it('answers with reviews and photos at the top level', async () => {
    const body = (await (await post({ placeId: 'p1' })).json()) as {
      reviews: unknown[]
      photos: unknown[]
    }
    expect(body.reviews).toHaveLength(1)
    expect(body.photos).toEqual(['https://photo/1'])
  })

  it('rejects a missing id', async () => {
    expect((await post({})).status).toBe(400)
    expect((await post({ placeId: '' })).status).toBe(400)
  })

  it('rejects an id far longer than any provider issues', async () => {
    expect((await post({ placeId: 'x'.repeat(5_000) })).status).toBe(400)
    expect(getPlaceReviews).not.toHaveBeenCalled()
  })

  /** A dead lookup still answers, so the panel shows what the search already had. */
  it('answers with empty lists when the provider fails', async () => {
    getPlaceReviews.mockRejectedValueOnce(new Error('down'))
    getPlacePhotos.mockRejectedValueOnce(new Error('down'))
    const body = (await (await post({ placeId: 'p1' })).json()) as {
      reviews: unknown[]
      photos: unknown[]
    }
    expect(body).toEqual({ reviews: [], photos: [] })
  })
})

describe('POST /api/places/details — a carousel’s worth', () => {
  it('keys each answer by its id', async () => {
    const body = (await (await post({ placeIds: ['a', 'b'] })).json()) as {
      places: Record<string, { photos: string[] }>
    }
    expect(Object.keys(body.places)).toEqual(['a', 'b'])
    expect(body.places.a.photos).toEqual(['https://photo/1'])
  })

  it('asks about each place once, however many times it appears', async () => {
    await post({ placeIds: ['a', 'a', 'a'] })
    expect(getPlaceReviews).toHaveBeenCalledTimes(1)
  })

  /** Two provider calls per place, so an uncapped batch is the expensive shape. */
  it('never asks about more places than one batch', async () => {
    await post({ placeIds: Array.from({ length: 50 }, (_, i) => `p${i}`) })
    expect(getPlaceReviews).toHaveBeenCalledTimes(6)
  })

  it('skips ids that are not usable', async () => {
    await post({ placeIds: [null, '', 7, 'x'.repeat(5_000), 'good'] })
    expect(getPlaceReviews).toHaveBeenCalledTimes(1)
    expect(getPlaceReviews).toHaveBeenCalledWith('good', undefined)
  })
})
