import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInMemoryTripStore } from '@/lib/share/share'
import { createTrip, addStay } from '@/lib/trip/tripState'
import type { TripState } from '@/lib/trip/types'
import type { TripStore } from '@/lib/share/share'

/** One store for the whole file, so a save and the next save see each other. */
let store: TripStore

vi.mock('@/lib/share/tripStore', () => ({ getTripStore: () => store }))
vi.mock('@/lib/rate/limit', () => ({
  checkRateLimit: async () => ({ ok: true }),
  tooManyRequests: () => new Response('slow down', { status: 429 }),
}))

const { POST } = await import('./route')

function post(body: unknown): Promise<Response> {
  return POST(
    new Request('https://triperco.test/api/trips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

function stay(name: string) {
  return {
    id: `s-${name}`,
    name,
    source: 'hotel' as const,
    pricePerNight: 100,
    nights: 2,
    photos: [],
    bookUrl: 'x',
  }
}

const trip = (): TripState => addStay(createTrip('draft'), stay('Hotel One'))

beforeEach(() => {
  store = createInMemoryTripStore()
})

describe('POST /api/trips — first save', () => {
  it('returns an id and the token that owns it', async () => {
    const { id, token } = (await (await post({ trip: trip() })).json()) as {
      id: string
      token: string
    }
    expect(id).toBeTruthy()
    expect(token).toBeTruthy()
    expect(await store.load(id)).not.toBeNull()
  })

  it('stores the trip under the id it hands out, not the draft id', async () => {
    const { id } = (await (await post({ trip: trip() })).json()) as { id: string }
    expect((await store.load(id))!.id).toBe(id)
  })

  it('rejects a request with no trip', async () => {
    expect((await post({})).status).toBe(400)
  })

  it('rejects a malformed body', async () => {
    const res = await POST(
      new Request('https://triperco.test/api/trips', { method: 'POST', body: '{oops' }),
    )
    expect(res.status).toBe(400)
  })
})

/**
 * One trip keeps one link. Before this every press of Share minted a new id, so a link already sent
 * to somebody froze at the plan as it was that moment.
 */
describe('POST /api/trips — saving again with the token', () => {
  it('keeps the same id', async () => {
    const first = (await (await post({ trip: trip() })).json()) as { id: string; token: string }
    const second = (await (
      await post({ trip: trip(), id: first.id, token: first.token })
    ).json()) as { id: string }
    expect(second.id).toBe(first.id)
  })

  it('updates what is behind the link, so a sent link shows the current plan', async () => {
    const first = (await (await post({ trip: trip() })).json()) as { id: string; token: string }
    const grown = addStay(trip(), stay('Hotel Two'))
    await post({ trip: grown, id: first.id, token: first.token })

    const loaded = await store.load(first.id)
    expect(loaded!.stays.map((s) => s.name)).toEqual(['Hotel One', 'Hotel Two'])
  })

  it('hands the same token back, so the link stays updatable', async () => {
    const first = (await (await post({ trip: trip() })).json()) as { id: string; token: string }
    const second = (await (
      await post({ trip: trip(), id: first.id, token: first.token })
    ).json()) as { token: string }
    expect(second.token).toBe(first.token)
  })
})

/**
 * The property that makes a stable link safe: holding the link is not permission to change what is
 * behind it. Anyone who opens a shared trip has its id and never its token.
 */
describe('POST /api/trips — without the right token', () => {
  it('will not overwrite someone else’s trip using just its id', async () => {
    const mine = (await (await post({ trip: trip() })).json()) as { id: string }
    const theirs = addStay(createTrip('draft'), stay('Hijacked'))

    const res = (await (await post({ trip: theirs, id: mine.id })).json()) as { id: string }

    expect(res.id).not.toBe(mine.id)
    // The original is untouched.
    expect((await store.load(mine.id))!.stays.map((s) => s.name)).toEqual(['Hotel One'])
  })

  it('will not overwrite it with a guessed token', async () => {
    const mine = (await (await post({ trip: trip() })).json()) as { id: string }
    const theirs = addStay(createTrip('draft'), stay('Hijacked'))

    const res = (await (
      await post({ trip: theirs, id: mine.id, token: 'not-the-token' })
    ).json()) as { id: string }

    expect(res.id).not.toBe(mine.id)
    expect((await store.load(mine.id))!.stays.map((s) => s.name)).toEqual(['Hotel One'])
  })

  it('still saves their copy, at an address of its own', async () => {
    const mine = (await (await post({ trip: trip() })).json()) as { id: string }
    const theirs = addStay(createTrip('draft'), stay('Their version'))

    const res = (await (await post({ trip: theirs, id: mine.id })).json()) as { id: string }
    expect((await store.load(res.id))!.stays.map((s) => s.name)).toEqual(['Their version'])
  })

  it('mints a new id for an id that was never saved', async () => {
    const res = (await (
      await post({ trip: trip(), id: 'never-existed', token: 'whatever' })
    ).json()) as { id: string }
    expect(res.id).not.toBe('never-existed')
  })

  it('never returns a token belonging to a trip it did not create', async () => {
    const mine = (await (await post({ trip: trip() })).json()) as { id: string; token: string }
    const res = (await (await post({ trip: trip(), id: mine.id })).json()) as { token: string }
    expect(res.token).not.toBe(mine.token)
  })
})
