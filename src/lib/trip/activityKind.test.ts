import { describe, it, expect } from 'vitest'
import {
  classifyActivity,
  activityKindLabel,
  eventOutsideTrip,
  showsOpeningHours,
} from './activityKind'
import type { Place } from './types'

function place(over: Partial<Place> = {}): Place {
  return { id: 'p1', name: 'Somewhere', photos: [], reviewSnippets: [], sourceLinks: {}, ...over }
}

describe('classifyActivity', () => {
  it('treats an ordinary listing as an attraction', () => {
    expect(classifyActivity(place({ category: 'Museum' }))).toBe('attraction')
  })

  it('recognises something you book rather than turn up to', () => {
    expect(classifyActivity(place({ category: 'Boat tour agency' }))).toBe('tour')
    expect(classifyActivity(place({ category: 'Wine tasting room' }))).toBe('tour')
    expect(classifyActivity(place({ category: 'Cooking class' }))).toBe('tour')
  })

  it('reads the types list when the category says nothing', () => {
    expect(classifyActivity(place({ category: 'Agency', types: ['Sightseeing tour agency'] }))).toBe(
      'tour',
    )
  })

  it('treats anything with a date as an event', () => {
    expect(classifyActivity(place({ startDate: '2026-08-02' }))).toBe('event')
  })

  it('lets the provider override the guess', () => {
    expect(classifyActivity(place({ activityKind: 'event', category: 'Museum' }))).toBe('event')
  })

  it('does not mistake a restaurant for a tour', () => {
    expect(classifyActivity(place({ category: 'Trattoria' }))).toBe('activity')
    expect(classifyActivity(place({ category: 'Wine bar' }))).toBe('activity')
  })
})

/**
 * Somewhere you go to see something and somewhere you go to do something are not interchangeable
 * suggestions, and a single "things to do" list made them look like they were.
 */
describe('classifyActivity — visiting versus doing', () => {
  it('reads sights as places to visit', () => {
    for (const category of [
      'Museum',
      'Historical landmark',
      'Catholic cathedral',
      'Observation deck',
      'Art gallery',
      'Castle',
      'Park',
    ]) {
      expect(classifyActivity(place({ category }))).toBe('attraction')
    }
  })

  it('reads eating and drinking as things to do', () => {
    for (const category of ['Restaurant', 'Pizzeria', 'Coffee shop', 'Cocktail bar', 'Bakery']) {
      expect(classifyActivity(place({ category }))).toBe('activity')
    }
  })

  it('reads doing-something places as things to do', () => {
    for (const category of [
      'Water park',
      'Spa',
      'Bowling alley',
      'Escape room center',
      'Scuba diving center',
      'Beach club',
    ]) {
      expect(classifyActivity(place({ category }))).toBe('activity')
    }
  })

  it('keeps a booked wine tasting a tour, while a wine bar is a thing to do', () => {
    expect(classifyActivity(place({ category: 'Wine tasting room' }))).toBe('tour')
    expect(classifyActivity(place({ category: 'Wine bar' }))).toBe('activity')
  })

  it('reads the types list when the category says nothing useful', () => {
    expect(classifyActivity(place({ category: 'Point of interest', types: ['Seafood restaurant'] }))).toBe(
      'activity',
    )
  })

  it('still lets a date and an explicit kind win', () => {
    expect(classifyActivity(place({ category: 'Restaurant', startDate: '2026-08-02' }))).toBe('event')
    expect(classifyActivity(place({ category: 'Restaurant', activityKind: 'attraction' }))).toBe(
      'attraction',
    )
  })
})

describe('activityKindLabel', () => {
  it('names each kind for what it is', () => {
    expect(activityKindLabel('attraction', 4)).toBe('places to visit')
    expect(activityKindLabel('activity', 4)).toBe('things to do')
    expect(activityKindLabel('tour', 4)).toBe('tours')
    expect(activityKindLabel('event', 4)).toBe('events')
  })

  it('reads correctly for one', () => {
    expect(activityKindLabel('event', 1)).toBe('event')
    expect(activityKindLabel('attraction', 1)).toBe('place to visit')
    expect(activityKindLabel('activity', 1)).toBe('thing to do')
  })
})

describe('eventOutsideTrip', () => {
  const trip = { startDate: '2026-08-01', endDate: '2026-08-08' }

  it('flags an event before they arrive', () => {
    expect(eventOutsideTrip(place({ startDate: '2026-07-30' }), trip)).toBe(true)
  })

  it('flags an event after they leave', () => {
    expect(eventOutsideTrip(place({ startDate: '2026-08-12' }), trip)).toBe(true)
  })

  it('accepts one inside the window, including on the edges', () => {
    expect(eventOutsideTrip(place({ startDate: '2026-08-04' }), trip)).toBe(false)
    expect(eventOutsideTrip(place({ startDate: '2026-08-01' }), trip)).toBe(false)
    expect(eventOutsideTrip(place({ startDate: '2026-08-08' }), trip)).toBe(false)
  })

  it('never claims a clash it cannot know about', () => {
    // No date on the event, or no dates on the trip: an absence is not evidence.
    expect(eventOutsideTrip(place(), trip)).toBe(false)
    expect(eventOutsideTrip(place({ startDate: '2026-08-12' }), {})).toBe(false)
  })

  it('works with only one end of the trip known', () => {
    expect(eventOutsideTrip(place({ startDate: '2026-07-01' }), { startDate: '2026-08-01' })).toBe(true)
    expect(eventOutsideTrip(place({ startDate: '2026-09-01' }), { startDate: '2026-08-01' })).toBe(false)
  })
})

describe('showsOpeningHours', () => {
  it('only applies to somewhere you turn up', () => {
    expect(showsOpeningHours('attraction')).toBe(true)
    expect(showsOpeningHours('tour')).toBe(false)
    expect(showsOpeningHours('event')).toBe(false)
  })
})
