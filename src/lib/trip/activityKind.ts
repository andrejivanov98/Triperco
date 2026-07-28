import type { ActivityKind, Place, TripMeta } from './types'

/**
 * Categories that mean "you book this", not "you turn up here". A tour has no opening hours worth
 * showing and cannot be dropped in on, so it must not be presented like a museum.
 */
const TOUR_PATTERNS = [
  /\btour/i,
  /\bexcursion/i,
  /\bcruise/i,
  /\bsafari/i,
  /\bguide[ds]?\b/i,
  /\bsightseeing/i,
  /\bboat (?:trip|ride|rental)/i,
  /\bwine tasting/i,
  /\bcooking class/i,
  /\bworkshop/i,
  /\btravel agenc/i,
  /\bactivity (?:operator|provider)/i,
]

function looksLikeTour(text: string | undefined): boolean {
  if (!text) return false
  return TOUR_PATTERNS.some((pattern) => pattern.test(text))
}

/** What kind of thing to do this is. An explicit kind from the provider always wins. */
export function classifyActivity(place: Place): ActivityKind {
  if (place.activityKind) return place.activityKind
  if (place.startDate) return 'event'
  if (looksLikeTour(place.category)) return 'tour'
  if ((place.types ?? []).some(looksLikeTour)) return 'tour'
  return 'attraction'
}

/** The noun to put on a carousel of these. */
export function activityKindLabel(kind: ActivityKind, count: number): string {
  const plural = count === 1
  if (kind === 'tour') return plural ? 'tour' : 'tours'
  if (kind === 'event') return plural ? 'event' : 'events'
  return plural ? 'thing to do' : 'things to do'
}

/**
 * True when an event falls outside the trip. Better to say so on the card than to let someone add
 * something that happens the week after they fly home.
 *
 * Unknown dates are never "outside" — an absent date is not evidence of a clash.
 */
export function eventOutsideTrip(place: Place, meta: Pick<TripMeta, 'startDate' | 'endDate'>): boolean {
  if (!place.startDate) return false
  const { startDate, endDate } = meta
  if (!startDate && !endDate) return false
  if (startDate && place.startDate < startDate) return true
  if (endDate && place.startDate > endDate) return true
  return false
}

/** Whether opening hours mean anything for this kind. */
export function showsOpeningHours(kind: ActivityKind): boolean {
  return kind === 'attraction'
}
