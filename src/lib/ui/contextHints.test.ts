import { describe, it, expect } from 'vitest'
import { buildContextHints, formatContextHints, visibleSets } from './contextHints'
import { MAX_CARDS } from './rank'
import type { ResultSet } from './results'
import type { Flight, Stay, Place, TripState } from '@/lib/trip/types'

const AT = '2026-07-28T10:00:00.000Z'

function stay(id: string, over: Partial<Stay> = {}): Stay {
  return {
    id,
    name: `Stay ${id}`,
    source: 'hotel',
    pricePerNight: 100,
    nights: 3,
    photos: [],
    bookUrl: 'https://book/' + id,
    ...over,
  }
}

function flight(id: string, over: Partial<Flight> = {}): Flight {
  return { id, from: 'SKP', to: 'LJU', stops: 0, price: 100, bookUrl: 'https://fly/' + id, ...over }
}

function place(id: string, over: Partial<Place> = {}): Place {
  return { id, name: `Place ${id}`, photos: [], reviewSnippets: [], sourceLinks: {}, ...over }
}

/** The ids a set carries, for asserting which answer survived. */
function payloadIds(set: ResultSet): string[] {
  return set.items.map((i) => i.id)
}

/** Parse one hint's JSON payload. */
function payload(content: string) {
  return JSON.parse(content) as {
    showing: number
    has_more_results?: boolean
    items: Record<string, unknown>[]
  }
}

describe('buildContextHints — nothing on screen', () => {
  it('returns nothing when there are no results and no open panel', () => {
    expect(buildContextHints()).toEqual([])
    expect(buildContextHints({ sets: [], open: null })).toEqual([])
  })

  it('skips a set that ranks down to nothing', () => {
    const set: ResultSet = { kind: 'places', items: [place('a', { permanentlyClosed: true })] }
    expect(buildContextHints({ sets: [set], capturedAt: AT })).toEqual([])
  })
})

describe('buildContextHints — positions match the screen', () => {
  it('numbers items from 1 in the order the carousel shows them', () => {
    const set: ResultSet = {
      kind: 'stays',
      items: [
        stay('pricey', { pricePerNight: 400, rating: 4.1, reviewCount: 200 }),
        stay('value', { pricePerNight: 90, rating: 4.8, reviewCount: 300 }),
      ],
    }
    const [hint] = buildContextHints({ sets: [set], capturedAt: AT })
    const items = payload(hint.content).items

    // rankResults leads with Best value, so the cheap well-rated one is position 1.
    expect(items[0]).toMatchObject({ position: 1, id: 'value' })
    expect(items[1]).toMatchObject({ position: 2, id: 'pricey' })
  })

  it('carries the badges the traveler can see', () => {
    const set: ResultSet = { kind: 'flights', items: [flight('a', { price: 50 }), flight('b', { price: 900 })] }
    const [hint] = buildContextHints({ sets: [set], capturedAt: AT })
    expect(payload(hint.content).items[0].badges).toContain('Best value')
  })

  it('reports that more results exist beyond the cards shown', () => {
    const items = Array.from({ length: 16 }, (_, i) => stay(`s${i}`, { pricePerNight: 100 + i }))
    const [hint] = buildContextHints({ sets: [{ kind: 'stays', items }], capturedAt: AT })
    const parsed = payload(hint.content)
    // Read from MAX_CARDS, not repeated: the hint must describe exactly the cards on screen.
    expect(parsed.showing).toBe(MAX_CARDS)
    expect(parsed.has_more_results).toBe(true)
  })
})

describe('buildContextHints — the open item always survives', () => {
  it('flags the open card inside its result set', () => {
    const set: ResultSet = { kind: 'stays', items: [stay('a'), stay('b')] }
    const hints = buildContextHints({
      sets: [set],
      open: { kind: 'stays', item: stay('b') },
      capturedAt: AT,
    })
    const inSet = payload(hints[0].content).items.find((i) => i.id === 'b')
    expect(inSet).toMatchObject({ open_in_panel: true })
  })

  it('always emits a fuller detail hint for the open item', () => {
    const hints = buildContextHints({
      open: { kind: 'stays', item: stay('b', { address: 'Ulica 5, Ljubljana', locationRating: 4.5 }) },
      capturedAt: AT,
    })
    expect(hints).toHaveLength(1)
    expect(hints[0].hintType).toBe('stay_detail')
    expect(JSON.parse(hints[0].content)).toMatchObject({
      id: 'b',
      address: 'Ulica 5, Ljubljana',
      location_rating: 4.5,
    })
  })

  it('describes an open item that is not in any visible set', () => {
    // Opened from the plan rather than a card — the set it came from is long gone.
    const hints = buildContextHints({
      sets: [{ kind: 'stays', items: [stay('a')] }],
      open: { kind: 'places', item: place('museum', { name: 'City Museum' }) },
      capturedAt: AT,
    })
    expect(hints.map((h) => h.hintType)).toEqual(['stay_results', 'place_detail'])
    expect(JSON.parse(hints[1].content)).toMatchObject({ name: 'City Museum' })
  })
})

describe('buildContextHints — flight legs stay separate', () => {
  it('keeps outbound and return sets as distinct hints', () => {
    const sets: ResultSet[] = [
      { kind: 'flights', flightType: 'one_way', items: [flight('out')] },
      { kind: 'flights', flightType: 'return', items: [flight('home', { direction: 'return' })] },
    ]
    const hints = buildContextHints({ sets, capturedAt: AT })
    expect(hints).toHaveLength(2)
    expect(hints[1].description).toMatch(/way home/i)
  })

  it('reports only the newest answer when the same search ran twice', () => {
    const sets: ResultSet[] = [
      { kind: 'stays', query: 'Rome', items: [stay('a')] },
      { kind: 'stays', query: 'Rome', items: [stay('b')] },
    ]
    const hints = buildContextHints({ sets, capturedAt: AT })
    expect(hints).toHaveLength(1)
    expect(payload(hints[0].content).items[0].id).toBe('b')
  })

  it('reports both when they are different searches still on screen', () => {
    const sets: ResultSet[] = [
      { kind: 'stays', query: 'Rome', items: [stay('a')] },
      { kind: 'stays', query: 'Naples', items: [stay('b')] },
    ]
    expect(buildContextHints({ sets, capturedAt: AT })).toHaveLength(2)
  })
})

describe('visibleSets', () => {
  it('keeps the newest answer per question in first-appearance order', () => {
    const sets: ResultSet[] = [
      { kind: 'stays', query: 'Rome', items: [stay('a')] },
      { kind: 'places', query: 'things to do in Rome', items: [place('p')] },
      { kind: 'stays', query: 'Rome', items: [stay('b')] },
    ]
    expect(visibleSets(sets).map((s) => s.kind)).toEqual(['stays', 'places'])
    // The stays slot keeps its position but now holds the newer answer.
    expect(payloadIds(visibleSets(sets)[0])).toEqual(['b'])
  })

  it('keeps at most three sets', () => {
    const sets: ResultSet[] = [
      { kind: 'flights', flightType: 'one_way', items: [flight('a')] },
      { kind: 'flights', flightType: 'return', items: [flight('b')] },
      { kind: 'flights', flightType: 'round_trip', items: [flight('c')] },
      { kind: 'stays', items: [stay('d')] },
    ]
    expect(visibleSets(sets)).toHaveLength(3)
  })
})

describe('buildContextHints — degrades instead of failing', () => {
  it('omits absent fields rather than sending nulls', () => {
    const [hint] = buildContextHints({ sets: [{ kind: 'stays', items: [stay('a')] }], capturedAt: AT })
    const item = payload(hint.content).items[0]
    expect(item).not.toHaveProperty('rating')
    expect(item).not.toHaveProperty('deal')
    expect(item).toMatchObject({ id: 'a', name: 'Stay a' })
  })

  it('survives fields the provider sent as the wrong type', () => {
    const broken = stay('a', {
      rating: Number.NaN,
      reviewCount: undefined,
      amenities: [' ', 'Wi-Fi', 'Wi-Fi'] as string[],
    })
    const [hint] = buildContextHints({ sets: [{ kind: 'stays', items: [broken] }], capturedAt: AT })
    const item = payload(hint.content).items[0]
    expect(item).not.toHaveProperty('rating')
    // Blank dropped, duplicate collapsed.
    expect(item.amenities).toEqual(['Wi-Fi'])
  })

  it('truncates a long description on a word boundary', () => {
    const long = ('lorem ipsum dolor sit amet '.repeat(60)).trim()
    const hints = buildContextHints({
      open: { kind: 'places', item: place('a', { description: long }) },
      capturedAt: AT,
    })
    const { description } = JSON.parse(hints[0].content) as { description: string }
    expect(description.length).toBeLessThan(long.length)
    expect(description.endsWith('…')).toBe(true)
    // No half-words: everything before the ellipsis is whole.
    expect(description.slice(0, -1).trimEnd().endsWith('lorem') || /\w$/.test(description.slice(0, -1))).toBe(true)
  })

  it('keeps a huge set under the content budget without dropping the first item', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      stay(`s${i}`, {
        pricePerNight: 100 + i,
        amenities: Array.from({ length: 8 }, (_, a) => `Amenity ${a} with a fairly long descriptive name`),
        address: 'A very long street address that goes on for a while, Ljubljana, Slovenia',
      }),
    )
    const [hint] = buildContextHints({ sets: [{ kind: 'stays', items }], capturedAt: AT })
    expect(hint.content.length).toBeLessThanOrEqual(4000)
    expect(payload(hint.content).items.length).toBeGreaterThan(0)
  })
})

describe('formatContextHints', () => {
  it('is empty when there is nothing to say', () => {
    expect(formatContextHints([])).toBe('')
  })

  it('tells the model what the section is for and that prices are stale', () => {
    const hints = buildContextHints({ sets: [{ kind: 'stays', items: [stay('a')] }], capturedAt: AT })
    const text = formatContextHints(hints)
    expect(text).toMatch(/WHAT THE TRAVELER IS LOOKING AT RIGHT NOW/)
    expect(text).toMatch(/the second one/)
    expect(text).toMatch(/captured snapshot/)
    expect(text).toContain(AT)
    expect(text).toContain('[stay_results]')
  })
})

/**
 * The trip was already sent to the server and sat in the tool state, but nothing described it to the
 * model — so the agent could not tell an empty plan from a finished one, and "flights sorted, shall
 * we find a hotel?" was impossible to produce.
 */
describe('buildContextHints — what is in the plan', () => {
  const flight: Flight = { id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 120, bookUrl: 'x' }

  function trip(over: Partial<TripState> = {}): TripState {
    return {
      id: 't1',
      meta: { travelers: 2 },
      flights: [],
      stays: [],
      days: [],
      estimatedTotal: 0,
      ...over,
    }
  }

  const planPayload = (t: TripState) => {
    const hint = buildContextHints({ trip: t, capturedAt: AT }).find((h) => h.hintType === 'plan')
    return hint ? (JSON.parse(hint.content) as Record<string, unknown>) : null
  }

  it('says nothing at all about an empty plan', () => {
    expect(planPayload(trip())).toBeNull()
  })

  it('reports what has been added', () => {
    const payload = planPayload(trip({ flights: [flight] }))
    expect(payload?.flights).toBe(1)
  })

  it('names what is still missing, so the next step needs no working out', () => {
    const payload = planPayload(trip({ flights: [flight] }))
    expect(payload?.still_missing).toEqual(['somewhere to stay', 'things to do'])
  })

  it('stops naming something once it is in', () => {
    const payload = planPayload(
      trip({
        flights: [flight],
        stays: [stay('s1')],
        days: [{ items: [{ placeId: 'p1', name: 'Colosseum' }] }],
      }),
    )
    expect(payload?.still_missing).toBeUndefined()
  })

  it('counts things to do across every day', () => {
    const payload = planPayload(
      trip({
        days: [
          { items: [{ placeId: 'p1', name: 'A' }] },
          { items: [{ placeId: 'p2', name: 'B' }, { placeId: 'p3', name: 'C' }] },
        ],
      }),
    )
    expect(payload?.things_to_do).toBe(3)
  })

  it('comes last, after the transient screen contents', () => {
    const hints = buildContextHints({
      sets: [{ kind: 'stays', items: [stay('a')] }],
      trip: trip({ flights: [flight] }),
      capturedAt: AT,
    })
    expect(hints.at(-1)?.hintType).toBe('plan')
  })

  it('is absent when no trip was passed at all', () => {
    const hints = buildContextHints({ sets: [{ kind: 'stays', items: [stay('a')] }], capturedAt: AT })
    expect(hints.some((h) => h.hintType === 'plan')).toBe(false)
  })
})
