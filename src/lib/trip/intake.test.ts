import { describe, it, expect } from 'vitest'
import {
  DESTINATION_OPENINGS,
  INTEREST_LABELS,
  INTEREST_OPTIONS,
  briefOpen,
  interestsKnown,
  isDestinationOpening,
  partyKnown,
  vibesFromLabels,
} from './intake'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from './tripState'
import { TRIP_VIBES } from './types'

describe('the interest options', () => {
  it('offers a label for every vibe the trip can record', () => {
    expect(new Set(INTEREST_OPTIONS.map((o) => o.vibe))).toEqual(new Set(TRIP_VIBES))
  })

  it('offers each label once', () => {
    expect(new Set(INTEREST_LABELS).size).toBe(INTEREST_LABELS.length)
  })

  /** They are what a traveler taps, so they have to read like something a traveler would say. */
  it('names them in the traveler’s words, not the vocabulary behind them', () => {
    expect(INTEREST_LABELS).toContain('Food and restaurants')
    expect(INTEREST_LABELS).not.toContain('foodie')
  })
})

/**
 * The rows on the destination card are shapes of trip, not places.
 *
 * Naming them here rather than only in the card is what lets `metaFromAnswer` tell them apart from an
 * answer: recording "Somewhere warm" as the destination would ground every later search in it, and
 * "hotels in somewhere warm" is a question with no answer.
 */
describe('isDestinationOpening', () => {
  it('recognises every opening the card offers', () => {
    for (const opening of DESTINATION_OPENINGS) {
      expect(isDestinationOpening(opening)).toBe(true)
    }
  })

  it('does not care about case or stray spacing', () => {
    expect(isDestinationOpening('  surprise me  ')).toBe(true)
  })

  it('is false for somewhere real', () => {
    expect(isDestinationOpening('Barcelona')).toBe(false)
    expect(isDestinationOpening('Somewhere warm in Spain')).toBe(false)
  })
})

describe('vibesFromLabels', () => {
  it('reads the interests behind the labels that were picked', () => {
    expect(vibesFromLabels(['Food and restaurants', 'Culture and history'])).toEqual([
      'foodie',
      'culture',
    ])
  })

  it('ignores a label it does not know rather than guessing at it', () => {
    expect(vibesFromLabels(['Anything with a view'])).toEqual([])
  })

  it('does not care about case or stray spacing', () => {
    expect(vibesFromLabels([' nightlife '])).toEqual(['nightlife'])
    expect(vibesFromLabels(['NIGHTLIFE'])).toEqual(['nightlife'])
  })

  /** The order is the list's, not the traveler's, so two identical picks stay comparable. */
  it('records each interest once, in a stable order', () => {
    expect(vibesFromLabels(['Nightlife', 'Food and restaurants', 'Nightlife'])).toEqual([
      'foodie',
      'nightlife',
    ])
  })
})

/**
 * `travelers` is 1 on every new trip, so a default cannot answer who is going. Treating it as an
 * answer is how flights came to be priced for one adult on a trip for four.
 */
describe('partyKnown', () => {
  it('is false on a fresh trip', () => {
    expect(partyKnown(createTrip('t').meta)).toBe(false)
  })

  it('is true once the party is broken down', () => {
    expect(partyKnown({ travelers: 1, adults: 1 })).toBe(true)
    expect(partyKnown({ travelers: 1, children: 0 })).toBe(true)
  })

  it('is true once more than one head is named', () => {
    expect(partyKnown({ travelers: 3 })).toBe(true)
  })
})

describe('interestsKnown', () => {
  it('is false until they have been asked', () => {
    expect(interestsKnown({ travelers: 1 })).toBe(false)
  })

  /** Skipping is an answer. Without this the same form would arrive on every following turn. */
  it('counts an empty list as answered', () => {
    expect(interestsKnown({ travelers: 1, vibe: [] })).toBe(true)
  })

  it('counts a real answer as answered', () => {
    expect(interestsKnown({ travelers: 1, vibe: ['foodie'] })).toBe(true)
  })
})

/**
 * The brief closes the moment anything is chosen. Somebody else's shared trip arrives with flights
 * and no recorded interests, and asking what sort of trip they want would stall a finished plan.
 */
describe('briefOpen', () => {
  const flight = { id: 'f', from: 'SKP', to: 'BCN', stops: 0, price: 100, bookUrl: '' }
  const stay = {
    id: 's',
    name: 'Hotel',
    source: 'hotel' as const,
    pricePerNight: 90,
    nights: 3,
    photos: [],
    bookUrl: '',
  }

  it('is open on an empty plan', () => {
    expect(briefOpen(createTrip('t'))).toBe(true)
    expect(briefOpen(setMeta(createTrip('t'), { destination: 'Barcelona' }))).toBe(true)
  })

  it('is closed by anything in the plan', () => {
    expect(briefOpen(addFlight(createTrip('t'), flight))).toBe(false)
    expect(briefOpen(addStay(createTrip('t'), stay))).toBe(false)
    expect(briefOpen(addItineraryItem(createTrip('t'), 0, { placeId: 'p', name: 'Park' }))).toBe(
      false,
    )
  })

  /** A day that exists but holds nothing is still an empty plan. */
  it('is open when a day was made and never filled', () => {
    const trip = { ...createTrip('t'), days: [{ items: [] }, { items: [] }] }
    expect(briefOpen(trip)).toBe(true)
  })
})
