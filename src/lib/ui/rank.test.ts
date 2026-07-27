import { describe, it, expect } from 'vitest'
import { rankResults } from './rank'
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

  it('puts the best value first and badges it', () => {
    const ranked = rankResults({ kind: 'flights', items })
    expect(ranked[0].badges).toContain('Best value')
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

  it('caps a set at eight cards so the chat stays scannable', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      flight({ id: `f${i}`, price: 100 + i, durationMinutes: 200 }),
    )
    expect(rankResults({ kind: 'flights', items: many })).toHaveLength(8)
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
