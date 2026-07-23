import type { ReviewSnippet } from '../trip/types'

interface RawReview {
  review_id?: string
  user?: { name?: string }
  rating?: number
  snippet?: string
  text?: string
  date?: string
}

export interface RawReviewsResponse {
  reviews?: RawReview[]
}

export function normalizeReviews(raw: RawReviewsResponse): ReviewSnippet[] {
  return (raw.reviews ?? [])
    .map((r): ReviewSnippet | null => {
      const text = r.snippet ?? r.text
      if (!text) return null
      return { author: r.user?.name, rating: r.rating, text }
    })
    .filter((r): r is ReviewSnippet => r !== null)
}
