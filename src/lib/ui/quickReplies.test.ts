import { describe, it, expect } from 'vitest'
import { suggestQuickReplies } from './quickReplies'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from '@/lib/trip/tripState'
import type { TripState } from '@/lib/trip/types'

const flight = { id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 180, bookUrl: '' }
const stay = {
  id: 's1',
  name: 'Hotel X',
  source: 'hotel' as const,
  pricePerNight: 100,
  nights: 3,
  photos: [],
  bookUrl: '',
}

function planned(): TripState {
  let t = setMeta(createTrip('t'), {
    destination: 'Rome',
    startDate: '2026-09-01',
    endDate: '2026-09-04',
  })
  t = addFlight(t, flight)
  t = addStay(t, stay)
  return addItineraryItem(t, 0, { placeId: 'p1', name: 'Colosseum' })
}

describe('suggestQuickReplies', () => {
  it('offers inspiration when there is no destination yet', () => {
    const replies = suggestQuickReplies(createTrip('t'))
    expect(replies.length).toBeGreaterThan(0)
    expect(replies.join(' ')).toMatch(/somewhere|surprise|weekend/i)
  })

  it('asks about dates once a destination is known', () => {
    const trip = setMeta(createTrip('t'), { destination: 'Rome' })
    expect(suggestQuickReplies(trip).join(' ')).toMatch(/date|when|flexible/i)
  })

  it('names the destination in its suggestions', () => {
    const trip = setMeta(createTrip('t'), {
      destination: 'Rome',
      startDate: '2026-09-01',
      endDate: '2026-09-04',
    })
    expect(suggestQuickReplies(trip).join(' ')).toContain('Rome')
  })

  it('offers flights and a stay when dates are set but nothing is chosen', () => {
    const trip = setMeta(createTrip('t'), {
      destination: 'Rome',
      startDate: '2026-09-01',
      endDate: '2026-09-04',
    })
    const replies = suggestQuickReplies(trip).join(' ')
    expect(replies).toMatch(/flight/i)
    expect(replies).toMatch(/stay|hotel/i)
  })

  it('stops offering flights once a flight is in the trip', () => {
    let trip = setMeta(createTrip('t'), { destination: 'Rome', startDate: '2026-09-01', endDate: '2026-09-04' })
    trip = addFlight(trip, flight)
    expect(suggestQuickReplies(trip).join(' ')).not.toMatch(/find flights/i)
  })

  it('moves on to things to do and food once travel is booked', () => {
    let trip = setMeta(createTrip('t'), { destination: 'Rome', startDate: '2026-09-01', endDate: '2026-09-04' })
    trip = addFlight(trip, flight)
    trip = addStay(trip, stay)
    const replies = suggestQuickReplies(trip).join(' ')
    expect(replies).toMatch(/do|see/i)
    expect(replies).toMatch(/eat|food|restaurant/i)
  })

  it('offers refinements on a complete trip', () => {
    const replies = suggestQuickReplies(planned()).join(' ')
    expect(replies).toMatch(/cheaper|hidden gem|day by day/i)
  })

  it('never offers more than four at a time', () => {
    for (const trip of [createTrip('t'), planned()]) {
      expect(suggestQuickReplies(trip).length).toBeLessThanOrEqual(4)
    }
  })
})
