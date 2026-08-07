import { describe, it, expect } from 'vitest'
import { metaFromAnswer, SKIP_TEXT } from './intakeAnswers'
import type { TripMeta } from '@/lib/trip/types'
import { describeGuests } from './guests'
import { DESTINATION_OPENINGS } from '@/lib/trip/intake'

const blank: TripMeta = { travelers: 1 }

/**
 * The brief is driven by the stage, and the stage is a function of the trip — so an answer that only
 * reaches the trip through the model's `setTripMeta` leaves the stage where it was whenever the model
 * forgets to call it, and the same calendar arrives again on the next turn. Being asked twice for the
 * dates you just picked is the moment an app stops feeling like it is listening.
 *
 * These formats are ours, written by `datesAnswer`, `describeGuests` and a closed list of labels, so
 * reading them back is not guesswork.
 */
describe('metaFromAnswer — dates', () => {
  it('reads a chosen range', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'dates', text: '2027-03-19 to 2027-03-28' }, blank)).toEqual(
      { startDate: '2027-03-19', endDate: '2027-03-28' },
    )
  })

  it('reads a range with only a departure picked', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'dates', text: 'Leaving 2027-03-19' }, blank)).toEqual({
      startDate: '2027-03-19',
    })
  })

  /** Anything typed freehand is prose, and prose is the model's to interpret, not ours. */
  it('leaves a described range to the model', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'dates', text: 'a week in May' }, blank)).toEqual({})
  })
})

describe('metaFromAnswer — party', () => {
  it('reads the steppers, and derives the head count from them', () => {
    expect(
      metaFromAnswer(
        { kind: 'detail', field: 'party', text: describeGuests({ rooms: 2, adults: 2, children: 1 }) },
        blank,
      ),
    ).toEqual({ adults: 2, children: 1, travelers: 3, rooms: 2 })
  })

  it('reads a solo traveler', () => {
    expect(
      metaFromAnswer(
        { kind: 'detail', field: 'party', text: describeGuests({ rooms: 1, adults: 1, children: 0 }) },
        blank,
      ),
    ).toEqual({ adults: 1, children: 0, travelers: 1, rooms: 1 })
  })

  it('leaves a party described in words alone', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'party', text: 'me and the kids' }, blank)).toEqual({})
  })
})

describe('metaFromAnswer — places', () => {
  it('records a destination', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'destination', text: 'Barcelona' }, blank)).toEqual({
      destination: 'Barcelona',
    })
  })

  it('records a departure airport', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'origin', text: 'Skopje' }, blank)).toEqual({
      origin: 'Skopje',
    })
  })

  it('refuses a paragraph as a place name', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'destination', text: 'x'.repeat(200) }, blank)).toEqual({})
  })

  /*
   * "Somewhere warm" is a mood, not a destination. Recording it would ground every later search in it
   * — "hotels in somewhere warm" is a question with no answer — and it would name the phrase in the
   * prompt as the place they are going. The concierge turns an opening into somewhere real.
   */
  it('does not mistake an opening for a destination', () => {
    for (const opening of DESTINATION_OPENINGS) {
      expect(metaFromAnswer({ kind: 'detail', field: 'destination', text: opening }, blank)).toEqual({})
    }
  })

  /** Not being able to fly is a real answer: they are getting there themselves. */
  it('reads a skipped origin as transport they are handling', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'origin', text: SKIP_TEXT }, blank)).toEqual({
      skipped: ['transport'],
    })
  })

  it('keeps whatever else they were already handling themselves', () => {
    const meta: TripMeta = { travelers: 1, skipped: ['stay'] }
    expect(metaFromAnswer({ kind: 'detail', field: 'origin', text: SKIP_TEXT }, meta)).toEqual({
      skipped: ['stay', 'transport'],
    })
  })

  it('does not record transport twice', () => {
    const meta: TripMeta = { travelers: 1, skipped: ['transport'] }
    expect(metaFromAnswer({ kind: 'detail', field: 'origin', text: SKIP_TEXT }, meta)).toEqual({
      skipped: ['transport'],
    })
  })
})

describe('metaFromAnswer — interests', () => {
  it('reads the picked labels as interests', () => {
    expect(
      metaFromAnswer(
        { kind: 'form', intent: 'interests', text: 'Food and restaurants, Nightlife' },
        blank,
      ),
    ).toEqual({ vibe: ['foodie', 'nightlife'] })
  })

  /** An empty list is the answer, and the only thing that stops the form coming back. */
  it('reads skipping as an empty answer rather than as no answer', () => {
    expect(metaFromAnswer({ kind: 'form', intent: 'interests', text: SKIP_TEXT }, blank)).toEqual({
      vibe: [],
    })
  })

  /*
   * Any answer closes the question, including one that matched none of the options. Returning nothing
   * would leave the step where it was and the form would arrive again on the next turn — being asked
   * twice for what you just answered. The model can still read real interests out of the prose and
   * record them over the top.
   */
  it('closes the question even when nothing on the list was picked', () => {
    expect(
      metaFromAnswer({ kind: 'form', intent: 'interests', text: 'anything with a view' }, blank),
    ).toEqual({ vibe: [] })
  })

  /** A preference question the agent invented tells us nothing about the brief. */
  it('ignores a form that is not part of the brief', () => {
    expect(metaFromAnswer({ kind: 'form', text: 'Relaxed' }, blank)).toEqual({})
  })
})

/** Bands are not figures, and inventing one would put a number in the plan nobody said. */
describe('metaFromAnswer — budget', () => {
  it('records nothing from a band', () => {
    expect(metaFromAnswer({ kind: 'detail', field: 'budget', text: 'Mid-range is fine' }, blank)).toEqual({})
  })
})
