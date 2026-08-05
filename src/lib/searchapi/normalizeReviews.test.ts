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
    expect(out[0]).toMatchObject({ rating: 5, text: 'Incredible history.' })
    expect(out[1].text).toBe('Busy but worth it.')
  })

  it("never carries the reviewer's name, so it cannot reach the model or the screen", () => {
    for (const review of normalizeReviews(raw)) {
      expect(review).not.toHaveProperty('author')
      expect(JSON.stringify(review)).not.toContain('Ana')
    }
  })

  it('cleans the markup out of a provider review body', () => {
    const [review] = normalizeReviews({
      reviews: [{ snippet: 'Great market 🌴<br><br>Bring cash &amp; comfy shoes' }],
    })
    expect(review.text).toBe('Great market 🌴 Bring cash & comfy shoes')
  })

  it('drops a review that was nothing but markup', () => {
    expect(normalizeReviews({ reviews: [{ snippet: '<br><br>' }] })).toEqual([])
  })

  it('keeps the date and like count so reviews can be shown in context', () => {
    const out = normalizeReviews({
      reviews: [{ user: { name: 'Ana' }, rating: 5, text: 'Great.', date: '2 weeks ago', likes: 3 }],
    })
    expect(out[0].date).toBe('2 weeks ago')
    expect(out[0].likes).toBe(3)
  })

  it('drops reviews with no text', () => {
    const out = normalizeReviews(raw)
    expect(out).toHaveLength(2) // r3 has no snippet/text
  })

  it('returns [] with no reviews', () => {
    expect(normalizeReviews({})).toEqual([])
  })
})
