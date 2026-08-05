import type { Place, ReviewSnippet } from '@/lib/trip/types'

/** What the batch endpoint returns per place. */
export interface PlaceDetail {
  reviews?: ReviewSnippet[]
  photos?: string[]
}

/** Matches MAX_BATCH on the route, so a request is never silently truncated. */
export const ENRICH_BATCH = 6

/** A place already carrying a photo and something a visitor said needs no lookup. */
export function needsEnrichment(place: Place): boolean {
  return place.photos.length <= 1 || place.reviewSnippets.length === 0
}

/**
 * Which of these cards are worth a lookup, capped at one batch.
 *
 * The first few arrive complete from the search itself, so this is about the ones behind them —
 * fetching every card in a twenty-result carousel would cost forty provider calls to fill in cards
 * most travelers never scroll to.
 */
export function idsToEnrich(places: Place[], limit = ENRICH_BATCH): string[] {
  return places
    .filter(needsEnrichment)
    .slice(0, limit)
    .map((p) => p.id)
}

/**
 * Merge fetched detail onto the places it belongs to. Pure, and never destructive: an empty answer
 * leaves what the search already gave us, so a place can only ever gain from this.
 */
export function mergePlaceDetails(
  places: Place[],
  details: Record<string, PlaceDetail>,
): Place[] {
  return places.map((place) => {
    const detail = details[place.id]
    if (!detail) return place
    const photos = detail.photos?.length
      ? [...new Set([...place.photos, ...detail.photos])]
      : place.photos
    const reviewSnippets = detail.reviews?.length ? detail.reviews : place.reviewSnippets
    return { ...place, photos, reviewSnippets }
  })
}
