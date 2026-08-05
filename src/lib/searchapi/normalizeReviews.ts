import type { ReviewSnippet } from '../trip/types'
import { sanitizeReviewText } from './reviewText'

interface RawReview {
  review_id?: string
  user?: { name?: string }
  rating?: number
  snippet?: string
  text?: string
  date?: string
  likes?: number
}

export interface RawReviewsResponse {
  reviews?: RawReview[]
}

/**
 * Reviews as quotable prose.
 *
 * The reviewer's name is deliberately dropped rather than carried and hidden. It is a real person's
 * name, it adds nothing to a travel decision, and holding it meant it travelled into the model's
 * context on every place lookup. Not collecting it is the only version of that with no leak.
 */
export function normalizeReviews(raw: RawReviewsResponse): ReviewSnippet[] {
  return (raw.reviews ?? [])
    .map((r): ReviewSnippet | null => {
      const text = sanitizeReviewText(r.snippet ?? r.text)
      if (!text) return null
      return { rating: r.rating, text, date: r.date, likes: r.likes }
    })
    .filter((r): r is ReviewSnippet => r !== null)
}
