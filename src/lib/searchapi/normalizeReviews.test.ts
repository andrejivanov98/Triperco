import { describe, it, expect } from 'vitest'
import { normalizeReviews, type RawReviewsResponse } from './normalizeReviews'

const raw: RawReviewsResponse = {
  reviews: [
    { review_id: 'r1', user: { name: 'Ana' }, rating: 5, snippet: 'Incredible history.', date: '2 days ago' },
    { review_id: 'r2', user: { name: 'Marko' }, rating: 4, text: 'Busy but worth it.', date: '1 week ago' },
    { review_id: 'r3', user: { name: 'NoText' }, rating: 3, date: '3 weeks ago' },
  ],
}

describe('normalizeReviews', () => {
  it('maps reviews, preferring snippet then text', () => {
    const out = normalizeReviews(raw)
    expect(out[0]).toEqual({ author: 'Ana', rating: 5, text: 'Incredible history.' })
    expect(out[1].text).toBe('Busy but worth it.')
  })

  it('drops reviews with no text', () => {
    const out = normalizeReviews(raw)
    expect(out).toHaveLength(2) // r3 has no snippet/text
  })

  it('returns [] with no reviews', () => {
    expect(normalizeReviews({})).toEqual([])
  })
})
