import { describe, it, expect } from 'vitest'
import { tripProgress, nextGapPrompt } from './progress'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from './tripState'
import type { Flight, Stay, TripState } from './types'

function flight(id: string, over: Partial<Flight> = {}): Flight {
  return { id, from: 'SKP', to: 'FCO', stops: 0, price: 100, bookUrl: 'x', ...over }
}

function stay(id: string): Stay {
  return { id, name: 'Hotel', source: 'hotel', pricePerNight: 100, nights: 3, photos: [], bookUrl: 'x' }
}

function trip(over: Partial<TripState> = {}): TripState {
  return { ...createTrip('t1'), ...over }
}

describe('tripProgress', () => {
  it('starts with nothing done', () => {
    const progress = tripProgress(trip())
    expect(progress.added).toBe(0)
    expect(progress.complete).toBe(false)
    expect(progress.steps.map((s) => s.key)).toEqual(['destination', 'transport', 'stay'])
  })

  it('counts the destination once it is known', () => {
    const progress = tripProgress(trip({ meta: { travelers: 2, destination: 'Rome' } }))
    expect(progress.steps[0]).toMatchObject({ added: 1, done: true })
  })

  it('wants two legs when the trip has a start and an end', () => {
    const progress = tripProgress(
      trip({ meta: { travelers: 2, startDate: '2026-08-01', endDate: '2026-08-08' } }),
    )
    expect(progress.steps[1].target).toBe(2)
  })

  it('wants one leg for a single-day trip', () => {
    const progress = tripProgress(
      trip({ meta: { travelers: 2, startDate: '2026-08-01', endDate: '2026-08-01' } }),
    )
    expect(progress.steps[1].target).toBe(1)
  })

  it('knows a round trip covers both legs', () => {
    const progress = tripProgress(
      trip({ flights: [flight('a', { returnLeg: flight('b', { direction: 'return' }) })] }),
    )
    expect(progress.steps[1].target).toBe(2)
  })

  it('never counts more than the target', () => {
    const progress = tripProgress(trip({ stays: [stay('a'), stay('b')] }))
    expect(progress.steps[2]).toMatchObject({ added: 1, target: 1, done: true })
  })

  it('is complete once there is a destination, the legs and a bed', () => {
    const progress = tripProgress(
      trip({
        meta: { travelers: 2, destination: 'Rome' },
        flights: [flight('a'), flight('b', { direction: 'return' })],
        stays: [stay('s')],
      }),
    )
    expect(progress.complete).toBe(true)
    expect(progress.added).toBe(progress.target)
  })
})

describe('nextGapPrompt', () => {
  it('asks for the destination first', () => {
    expect(nextGapPrompt(trip())).toMatch(/where to go/i)
  })

  it('asks for flights once the destination is known', () => {
    expect(nextGapPrompt(trip({ meta: { travelers: 2, destination: 'Rome' } }))).toMatch(/flights/i)
  })

  it('asks for the way home when only the outbound is in', () => {
    const state = trip({
      meta: { travelers: 2, destination: 'Rome', startDate: '2026-08-01', endDate: '2026-08-08' },
      flights: [flight('a')],
    })
    expect(nextGapPrompt(state)).toMatch(/flight home/i)
  })

  it('asks for a stay last', () => {
    const state = trip({
      meta: { travelers: 2, destination: 'Rome' },
      flights: [flight('a'), flight('b', { direction: 'return' })],
    })
    expect(nextGapPrompt(state)).toMatch(/somewhere to stay/i)
  })

  it('has nothing to ask for once the trip is covered', () => {
    const state = trip({
      meta: { travelers: 2, destination: 'Rome' },
      flights: [flight('a'), flight('b', { direction: 'return' })],
      stays: [stay('s')],
    })
    expect(nextGapPrompt(state)).toBeUndefined()
  })
})

/**
 * `meta.destination` is only set when the agent remembers to record it, and it was routinely empty
 * while the plan already held a hotel and a flight. The panel then showed "Where to" unticked and
 * offered "Help me pick where to go" to somebody who had plainly already picked.
 */
describe('the plan itself settles where they are going', () => {
  const rome: Stay = {
    id: 's1',
    name: 'Hotel Artemide',
    source: 'hotel',
    pricePerNight: 120,
    nights: 3,
    photos: [],
    bookUrl: 'x',
  }

  it('ticks Where to once a stay is in the plan, even with no destination recorded', () => {
    const trip = addStay(createTrip('t1'), rome)
    expect(trip.meta.destination).toBeUndefined()
    const step = tripProgress(trip).steps.find((s) => s.key === 'destination')!
    expect(step.done).toBe(true)
    expect(step.added).toBe(1)
  })

  it('ticks it once a flight is in the plan', () => {
    const trip = addFlight(createTrip('t1'), {
      id: 'f1',
      from: 'SKP',
      to: 'FCO',
      stops: 0,
      price: 90,
      bookUrl: 'x',
    })
    expect(tripProgress(trip).steps[0].done).toBe(true)
  })

  it('ticks it once a thing to do is in the plan', () => {
    const trip = addItineraryItem(createTrip('t1'), 0, { placeId: 'p1', name: 'Colosseum' })
    expect(tripProgress(trip).steps[0].done).toBe(true)
  })

  it('never offers to help pick a destination once the plan has something in it', () => {
    const trip = addStay(createTrip('t1'), rome)
    expect(nextGapPrompt(trip)).not.toMatch(/where to go/i)
    // It moves on to the real gap instead.
    expect(nextGapPrompt(trip)).toMatch(/flights/i)
  })

  it('still asks on a genuinely empty plan', () => {
    const trip = createTrip('t1')
    expect(tripProgress(trip).steps[0].done).toBe(false)
    expect(nextGapPrompt(trip)).toMatch(/where to go/i)
  })

  it('still honours a recorded destination on an empty plan', () => {
    const trip = setMeta(createTrip('t1'), { destination: 'Rome' })
    expect(tripProgress(trip).steps[0].done).toBe(true)
  })
})
