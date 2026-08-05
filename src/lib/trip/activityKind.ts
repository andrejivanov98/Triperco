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

/**
 * Somewhere you go to *do* something rather than to *see* something. Eating, drinking, swimming and
 * climbing are not sightseeing, and mixing them into one list means "visit the Colosseum" and "take
 * a cooking class" arrive as the same kind of suggestion.
 *
 * Checked after TOUR_PATTERNS, so a booked wine tasting stays a tour while a wine bar is an activity.
 */
const ACTIVITY_PATTERNS = [
  /\brestaurant/i,
  /\btrattoria|\bosteria|\btavern|\bbistro|\bbrasserie/i,
  /\bpizzeria|\bsteakhouse|\bsushi\b|\bramen\b/i,
  /\bcaf[eé]\b|\bcoffee/i,
  /\bbar\b|\bpub\b|\bwine bar|\bcocktail|\bbrewery|\bbrewpub/i,
  /\bnight ?club|\bdisco|\blounge\b/i,
  /\bfood (?:court|hall|stand|truck)|\bmarket\b|\bdeli\b|\bbakery|\bice cream|\bgelato/i,
  /\bspa\b|\bhammam|\bmassage|\bthermal bath|\bonsen/i,
  /\bbeach club|\bwater ?park|\baqua ?park|\bswimming pool/i,
  /\bamusement|\btheme park|\bfun ?fair|\barcade|\bbowling|\bkarting|\bgo-kart/i,
  /\bescape room|\bpaintball|\blaser tag|\bmini ?golf/i,
  /\bclimbing|\bbouldering|\bdiving|\bsnorkel|\bsurf|\bkayak|\brafting|\bzip ?line|\bski (?:resort|school)/i,
  /\bgym\b|\byoga\b|\bfitness/i,
]

function matches(patterns: RegExp[], text: string | undefined): boolean {
  if (!text) return false
  return patterns.some((pattern) => pattern.test(text))
}

function looksLikeTour(text: string | undefined): boolean {
  return matches(TOUR_PATTERNS, text)
}

function looksLikeActivity(text: string | undefined): boolean {
  return matches(ACTIVITY_PATTERNS, text)
}

/** What kind of thing to do this is. An explicit kind from the provider always wins. */
export function classifyActivity(place: Place): ActivityKind {
  if (place.activityKind) return place.activityKind
  if (place.startDate) return 'event'
  if (looksLikeTour(place.category)) return 'tour'
  if ((place.types ?? []).some(looksLikeTour)) return 'tour'
  if (looksLikeActivity(place.category)) return 'activity'
  if ((place.types ?? []).some(looksLikeActivity)) return 'activity'
  return 'attraction'
}

/** The noun to put on a carousel of these. */
export function activityKindLabel(kind: ActivityKind, count: number): string {
  const singular = count === 1
  if (kind === 'tour') return singular ? 'tour' : 'tours'
  if (kind === 'event') return singular ? 'event' : 'events'
  if (kind === 'activity') return singular ? 'thing to do' : 'things to do'
  return singular ? 'place to visit' : 'places to visit'
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

/**
 * Whether opening hours mean anything for this kind. They do for anywhere you turn up — a museum
 * and a restaurant both close — and they do not for something you book or something with a fixed
 * date of its own.
 */
export function showsOpeningHours(kind: ActivityKind): boolean {
  return kind === 'attraction' || kind === 'activity'
}
