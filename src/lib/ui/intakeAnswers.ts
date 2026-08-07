import type { SkippablePart } from '@/lib/trip/stage'
import type { TripMeta } from '@/lib/trip/types'
import { isDestinationOpening, vibesFromLabels } from '@/lib/trip/intake'
import type { DetailField } from './interactions'

/**
 * Reading an answer to one of our own guided cards back into the trip.
 *
 * The model is asked to record these with `setTripMeta`, and usually does. When it does not, the stage
 * has not moved, so the same card arrives again on the next turn — and being asked twice for the dates
 * you just picked is the moment an app stops feeling like it is listening.
 *
 * These formats are ours. `datesAnswer` and `describeGuests` wrote them, and the interest labels come
 * from a closed list, so parsing them is not guesswork. Anything typed freehand falls through
 * untouched and is left to the model, which is the right owner for prose.
 */

/** What one of our cards sent, and which question it was answering. */
export type IntakeAnswer =
  | { kind: 'detail'; field: DetailField; text: string }
  | { kind: 'form'; intent?: 'interests'; text: string }

/** The exact sentence the guided cards send when the traveler skips. */
export const SKIP_TEXT = "Let's skip that."

/** A place name we are willing to store: short enough to be a name, not a paragraph. */
const MAX_PLACE_CHARS = 80

function placeName(text: string): string | undefined {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed.length === 0 || trimmed.length > MAX_PLACE_CHARS) return undefined
  return trimmed
}

/** "2027-03-19 to 2027-03-28", or "Leaving 2027-03-19" for a one-ended range. */
function dates(text: string): Partial<TripMeta> | undefined {
  const range = text.match(/^(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})$/)
  if (range) return { startDate: range[1], endDate: range[2] }
  const single = text.match(/^Leaving\s+(\d{4}-\d{2}-\d{2})$/)
  if (single) return { startDate: single[1] }
  return undefined
}

/**
 * "2 adults · 1 child · 1 room", as `describeGuests` writes it.
 *
 * Read field by field rather than by matching the whole shape, so the parts that are present are
 * recorded even if the wording drifts. `travelers` is derived here because every price downstream
 * uses it, and it must never disagree with the breakdown it came from.
 */
function party(text: string): Partial<TripMeta> | undefined {
  const adults = text.match(/(\d+)\s+adults?\b/i)
  if (!adults) return undefined
  const children = text.match(/(\d+)\s+(?:child|children)\b/i)
  const rooms = text.match(/(\d+)\s+rooms?\b/i)

  const adultCount = Number(adults[1])
  const childCount = children ? Number(children[1]) : 0
  if (!Number.isFinite(adultCount) || adultCount < 1) return undefined

  return {
    adults: adultCount,
    children: childCount,
    travelers: adultCount + childCount,
    ...(rooms ? { rooms: Number(rooms[1]) } : {}),
  }
}

/**
 * The trip metadata an answer implies. Empty when it implies nothing we can be sure of.
 *
 * `current` is read rather than replaced for the one field that accumulates: skipping the departure
 * airport means they are getting there themselves, and that has to join whatever else they had
 * already told us they were handling.
 */
export function metaFromAnswer(answer: IntakeAnswer, current: TripMeta): Partial<TripMeta> {
  const text = answer.text.trim()
  const skipped = text === SKIP_TEXT

  if (answer.kind === 'form') {
    if (answer.intent !== 'interests') return {}
    /*
     * Any answer closes the question, including one that matched none of the options.
     *
     * An empty list is a real value: asked, and nothing from the closed list to record. Returning
     * nothing instead would leave the step exactly where it was, and the form would arrive again on
     * the next turn — which is what being asked twice for something you just answered looks like. The
     * model is still free to read real interests out of the prose and record them over the top.
     */
    return { vibe: vibesFromLabels(skipped ? [] : text.split(',').map((part) => part.trim())) }
  }

  switch (answer.field) {
    case 'destination':
      if (skipped) return {}
      /*
       * "Somewhere warm" is a mood, not a destination. Recording it would ground every later search in
       * it — "hotels in somewhere warm" is a question with no answer — and it would put the phrase in
       * the prompt as the place they are going. The concierge turns an opening into somewhere real and
       * records that instead.
       */
      if (isDestinationOpening(text)) return {}
      return placeName(text) ? { destination: placeName(text) } : {}

    case 'origin': {
      if (skipped) {
        const parts = new Set<SkippablePart>(current.skipped ?? [])
        parts.add('transport')
        return { skipped: [...parts] }
      }
      return placeName(text) ? { origin: placeName(text) } : {}
    }

    case 'dates':
      return skipped ? {} : (dates(text) ?? {})

    case 'party':
      return skipped ? {} : (party(text) ?? {})

    // Bands like "Mid-range is fine" are not a figure, and inventing one from them would put a
    // number in the plan the traveler never said. The model reads the words instead.
    case 'budget':
      return {}
  }
}
