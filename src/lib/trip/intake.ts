import type { TripMeta, TripState, TripVibe } from './types'

/**
 * The brief: what has to be known before a trip can sensibly be planned, and how to ask for it.
 *
 * The planner used to start searching on whatever the opening sentence happened to carry. Someone who
 * typed "Barcelona in May" got flights priced for one adult, stays chosen for nobody in particular,
 * and things to do picked from no stated interest at all — and every one of those was a question a
 * control answers better than a sentence does.
 *
 * So the brief is taken first, with the guided cards the chat already renders. Which control belongs
 * to which question lives here; when to ask lives in `stage.ts`.
 */

/** What the traveler picks from, and the vibe each answer records. Their words, our vocabulary. */
export const INTEREST_OPTIONS: { label: string; vibe: TripVibe }[] = [
  { label: 'Food and restaurants', vibe: 'foodie' },
  { label: 'Culture and history', vibe: 'culture' },
  { label: 'Nightlife', vibe: 'nightlife' },
  { label: 'Beaches and slow days', vibe: 'relaxed' },
  { label: 'Adventure and the outdoors', vibe: 'adventure' },
  { label: 'Good for kids', vibe: 'family' },
  { label: 'Keep it cheap', vibe: 'budget' },
  { label: 'Treat ourselves', vibe: 'luxury' },
]

export const INTEREST_LABELS: string[] = INTEREST_OPTIONS.map((option) => option.label)

/**
 * Openings for somebody who has not chosen a destination yet.
 *
 * Deliberately not a list of cities: naming four would make the other two hundred feel wrong, and the
 * question a blank field cannot answer is not "which city" but "what am I even in the mood for".
 *
 * They are shapes of trip rather than destinations, which is why they are named here rather than only
 * in the card. `metaFromAnswer` reads this list too — recording "Somewhere warm" as the destination
 * would ground every later search in it, and "hotels in somewhere warm" is a question with no answer.
 */
export const DESTINATION_OPENINGS: string[] = [
  'Somewhere warm',
  'A city break in Europe',
  'Somewhere cheap to fly to',
  'Surprise me',
]

/** Whether an answer to the destination card names a place, or only a mood. */
export function isDestinationOpening(text: string): boolean {
  const asked = text.trim().toLowerCase()
  return DESTINATION_OPENINGS.some((opening) => opening.toLowerCase() === asked)
}

/** The interests behind a set of chosen labels. Unknown labels are ignored, never guessed at. */
export function vibesFromLabels(labels: string[]): TripVibe[] {
  const wanted = new Set(labels.map((label) => label.trim().toLowerCase()))
  return INTEREST_OPTIONS.filter((option) => wanted.has(option.label.toLowerCase())).map(
    (option) => option.vibe,
  )
}

/**
 * Whether we know who is going.
 *
 * `travelers` is 1 on every new trip, so it cannot answer this by itself — a default is not an
 * answer. Either the party was broken down explicitly, or more than one head was named.
 */
export function partyKnown(meta: TripMeta): boolean {
  return meta.adults !== undefined || meta.children !== undefined || meta.travelers > 1
}

/**
 * Whether they have said what the trip is for.
 *
 * An empty array is a real answer: it is what skipping records, and someone who declined to pick
 * interests must not be asked again on the next turn.
 */
export function interestsKnown(meta: TripMeta): boolean {
  return meta.vibe !== undefined
}

/**
 * Whether the brief is still open at all.
 *
 * It closes the moment anything is in the plan. A trip arriving from somebody else's link already has
 * flights in it, and reopening its brief would stall a finished plan on a question nobody needs
 * answered — the same failure as re-asking for a destination somebody already named.
 */
export function briefOpen(trip: TripState): boolean {
  return (
    trip.flights.length === 0 &&
    trip.stays.length === 0 &&
    trip.days.every((day) => day.items.length === 0)
  )
}
