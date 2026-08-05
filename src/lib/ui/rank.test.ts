import { describe, it, expect } from 'vitest'
import { rankResults, BADGE_PRIORITY, MAX_CARDS } from './rank'
import type { Flight, Stay, Place } from '@/lib/trip/types'

function flight(p: Partial<Flight> & { id: string; price: number }): Flight {
  return { from: 'SKP', to: 'FCO', stops: 0, bookUrl: '', ...p }
}
function stay(p: Partial<Stay> & { id: string; pricePerNight: number }): Stay {
  return { name: p.id, source: 'hotel', nights: 3, photos: [], bookUrl: '', ...p }
}
function place(p: Partial<Place> & { id: string }): Place {
  return { name: p.id, photos: [], reviewSnippets: [], sourceLinks: {}, ...p }
}

describe('rankResults — flights', () => {
  const items = [
    flight({ id: 'slow-cheap', price: 100, durationMinutes: 700, stops: 2 }),
    flight({ id: 'fast-pricey', price: 400, durationMinutes: 150, stops: 0 }),
    flight({ id: 'middle', price: 180, durationMinutes: 200, stops: 1 }),
  ]

  it('badges the cheapest and the fastest', () => {
    const ranked = rankResults({ kind: 'flights', items })
    const badges = new Map(ranked.map((r) => [r.item.id, r.badges]))
    expect(badges.get('slow-cheap')).toContain('Cheapest')
    expect(badges.get('fast-pricey')).toContain('Fastest')
  })

  it('badges a nonstop flight', () => {
    const ranked = rankResults({ kind: 'flights', items })
    const nonstop = ranked.find((r) => r.item.id === 'fast-pricey')
    expect(nonstop?.badges).toContain('Nonstop')
  })

  it('leads with the cheapest, and still badges the best value', () => {
    const ranked = rankResults({ kind: 'flights', items })
    expect(ranked[0].badges).toContain('Cheapest')
    expect(ranked.flatMap((r) => r.badges)).toContain('Best value')
  })

  it('never gives one item the same badge twice', () => {
    const ranked = rankResults({ kind: 'flights', items: [flight({ id: 'only', price: 100 })] })
    expect(ranked[0].badges).toEqual([...new Set(ranked[0].badges)])
  })
})

describe('rankResults — stays', () => {
  const items = [
    stay({ id: 'budget', pricePerNight: 60, rating: 3.9, reviewCount: 400 }),
    stay({ id: 'lovely', pricePerNight: 150, rating: 4.8, reviewCount: 1200 }),
    stay({ id: 'thin-reviews', pricePerNight: 200, rating: 5, reviewCount: 3 }),
  ]

  it('badges the cheapest and the best rated with enough reviews', () => {
    const ranked = rankResults({ kind: 'stays', items })
    const badges = new Map(ranked.map((r) => [r.item.id, r.badges]))
    expect(badges.get('budget')).toContain('Cheapest')
    expect(badges.get('lovely')).toContain('Best rated')
    // 5★ from 3 reviews is not a signal.
    expect(badges.get('thin-reviews')).not.toContain('Best rated')
  })

  it('badges a deal from the provider', () => {
    const ranked = rankResults({
      kind: 'stays',
      items: [stay({ id: 'deal', pricePerNight: 90, dealBadge: '24% less than usual' })],
    })
    expect(ranked[0].badges).toContain('24% less than usual')
  })
})

describe('rankResults — places', () => {
  it('badges the top rated and the most reviewed', () => {
    const ranked = rankResults({
      kind: 'places',
      items: [
        place({ id: 'hidden', rating: 4.9, reviewCount: 120 }),
        place({ id: 'famous', rating: 4.6, reviewCount: 390000 }),
      ],
    })
    const badges = new Map(ranked.map((r) => [r.item.id, r.badges]))
    expect(badges.get('hidden')).toContain('Top rated')
    expect(badges.get('famous')).toContain('Most reviewed')
  })
})

describe('rankResults — general', () => {
  it('handles an empty set', () => {
    expect(rankResults({ kind: 'flights', items: [] })).toEqual([])
  })

  it('shows ten cards by default', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      flight({ id: `f${i}`, price: 100 + i, durationMinutes: 200 }),
    )
    expect(rankResults({ kind: 'flights', items: many })).toHaveLength(MAX_CARDS)
    expect(MAX_CARDS).toBeGreaterThanOrEqual(10)
  })

  it('returns everything when the traveler asks to see it all', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      flight({ id: `f${i}`, price: 100 + i, durationMinutes: 200 }),
    )
    expect(rankResults({ kind: 'flights', items: many }, many.length)).toHaveLength(20)
  })

  it('never returns more than the set holds, however large the limit', () => {
    const few = [flight({ id: 'a', price: 100 })]
    expect(rankResults({ kind: 'flights', items: few }, 500)).toHaveLength(1)
  })

  it('keeps the badged winners even when the set is capped', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      flight({ id: `f${i}`, price: 500 - i, durationMinutes: 600 - i }),
    )
    // f19 is both cheapest and fastest and would sort last by input order.
    const ranked = rankResults({ kind: 'flights', items: many })
    expect(ranked.map((r) => r.item.id)).toContain('f19')
  })
})

/**
 * The traveler should never have to scroll to find the obvious options. Provider order buries them:
 * the cheapest stay was regularly the eleventh card.
 */
describe('rankResults — the standouts lead', () => {
  it('orders the standouts by declared priority, cheapest first', () => {
    const items = [
      // Deliberately worst-first in provider order, so only ranking can fix it.
      stay({ id: 'plain', pricePerNight: 120 }),
      stay({ id: 'most-reviewed', pricePerNight: 130, rating: 4.2, reviewCount: 9000 }),
      stay({ id: 'best-rated', pricePerNight: 140, rating: 4.9, reviewCount: 800 }),
      stay({ id: 'cheapest', pricePerNight: 40, rating: 3.2, reviewCount: 500 }),
    ]
    const ranked = rankResults({ kind: 'stays', items })
    expect(ranked[0].item.id).toBe('cheapest')
    // Everything badged comes before the option with nothing to say for it.
    expect(ranked.at(-1)?.item.id).toBe('plain')
  })

  it('puts a provider deal ahead of an option with no badge at all', () => {
    const ranked = rankResults({
      kind: 'stays',
      items: [
        // A third, cheaper stay takes the Cheapest badge, so these two are separated only by the deal.
        stay({ id: 'cheapest', pricePerNight: 80 }),
        stay({ id: 'plain', pricePerNight: 100 }),
        stay({ id: 'deal', pricePerNight: 100, dealBadge: '24% less than usual' }),
      ],
    })
    const order = ranked.map((r) => r.item.id)
    expect(order.indexOf('deal')).toBeLessThan(order.indexOf('plain'))
  })

  it('badges the most reviewed stay, not just the most reviewed place', () => {
    const ranked = rankResults({
      kind: 'stays',
      items: [
        stay({ id: 'quiet', pricePerNight: 100, rating: 4.9, reviewCount: 40 }),
        stay({ id: 'busy', pricePerNight: 110, rating: 4.3, reviewCount: 9000 }),
      ],
    })
    const badges = new Map(ranked.map((r) => [r.item.id, r.badges]))
    expect(badges.get('busy')).toContain('Most reviewed')
  })

  it('ranks places by rating and review weight, not provider order', () => {
    const ranked = rankResults({
      kind: 'places',
      items: [
        place({ id: 'plain' }),
        place({ id: 'famous', rating: 4.6, reviewCount: 390000 }),
        place({ id: 'hidden', rating: 4.9, reviewCount: 120 }),
      ],
    })
    // 'Top rated' outranks 'Most reviewed' in BADGE_PRIORITY.
    expect(ranked.map((r) => r.item.id)).toEqual(['hidden', 'famous', 'plain'])
  })

  it('lists cheapest ahead of best value in the declared priority', () => {
    expect(BADGE_PRIORITY.indexOf('Cheapest')).toBeLessThan(BADGE_PRIORITY.indexOf('Best value'))
  })
})

describe('rankResults — closed places', () => {
  it('never offers a place that has closed down', () => {
    const ranked = rankResults({
      kind: 'places',
      items: [
        place({ id: 'gone', name: 'Old Bar', permanentlyClosed: true }),
        place({ id: 'open', name: 'New Bar' }),
      ],
    })
    expect(ranked.map((r) => r.item.id)).toEqual(['open'])
  })

  it('keeps a place that is merely shut right now', () => {
    const ranked = rankResults({
      kind: 'places',
      items: [place({ id: 'closed-now', openNow: false })],
    })
    expect(ranked).toHaveLength(1)
  })
})
