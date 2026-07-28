import { describe, it, expect } from 'vitest'
import { tripProgress, nextGapPrompt } from './progress'
import { createTrip } from './tripState'
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
