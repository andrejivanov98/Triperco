import { describe, it, expect } from 'vitest'
import { needsEnrichment, idsToEnrich, mergePlaceDetails, ENRICH_BATCH } from './enrichPlaces'
import type { Place } from '@/lib/trip/types'

function place(id: string, over: Partial<Place> = {}): Place {
  return { id, name: id, photos: [], reviewSnippets: [], sourceLinks: {}, ...over }
}

const complete = (id: string) =>
  place(id, { photos: ['a', 'b'], reviewSnippets: [{ text: 'Lovely.' }] })

describe('needsEnrichment', () => {
  it('is true for a card with only a thumbnail', () => {
    expect(needsEnrichment(place('a', { photos: ['thumb'] }))).toBe(true)
  })

  it('is true for a card with no review to quote', () => {
    expect(needsEnrichment(place('a', { photos: ['a', 'b'] }))).toBe(true)
  })

  it('is false once a card has both', () => {
    expect(needsEnrichment(complete('a'))).toBe(false)
  })
})

describe('idsToEnrich', () => {
  it('skips the cards the search already filled in', () => {
    expect(idsToEnrich([complete('a'), place('b'), complete('c')])).toEqual(['b'])
  })

  it('never asks for more than one batch', () => {
    const many = Array.from({ length: 20 }, (_, i) => place(`p${i}`))
    expect(idsToEnrich(many)).toHaveLength(ENRICH_BATCH)
  })

  it('asks for nothing when every card is complete', () => {
    expect(idsToEnrich([complete('a'), complete('b')])).toEqual([])
  })
})

describe('mergePlaceDetails', () => {
  it('adds photos and reviews to the right place', () => {
    const merged = mergePlaceDetails([place('a', { photos: ['thumb'] }), place('b')], {
      a: { photos: ['p1'], reviews: [{ text: 'Great.' }] },
    })
    // Fetched first, thumbnail after: the thumbnail must never become the card's cover.
    expect(merged[0].photos).toEqual(['p1', 'thumb'])
    expect(merged[0].reviewSnippets[0].text).toBe('Great.')
    expect(merged[1].photos).toEqual([])
  })

  it('never drops what the search already had', () => {
    const merged = mergePlaceDetails([place('a', { photos: ['thumb'], reviewSnippets: [{ text: 'Old.' }] })], {
      a: { photos: [], reviews: [] },
    })
    expect(merged[0].photos).toEqual(['thumb'])
    expect(merged[0].reviewSnippets[0].text).toBe('Old.')
  })

  it('does not duplicate a photo the search already had', () => {
    const merged = mergePlaceDetails([place('a', { photos: ['p1'] })], { a: { photos: ['p1', 'p2'] } })
    expect(merged[0].photos).toEqual(['p1', 'p2'])
  })

  it('leaves the list alone when there is nothing to merge', () => {
    const places = [place('a')]
    expect(mergePlaceDetails(places, {})).toEqual(places)
  })

  it('keeps the order it was given', () => {
    const merged = mergePlaceDetails([place('a'), place('b'), place('c')], { b: { photos: ['x'] } })
    expect(merged.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
})
