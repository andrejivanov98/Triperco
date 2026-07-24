import { describe, it, expect } from 'vitest'
import { buildTimeline } from './timeline'
import { createTrip } from './tripState'
import type { TripState } from './types'

function base(): TripState {
  return {
    ...createTrip('t1'),
    meta: { travelers: 2, destination: 'Tenerife', startDate: '2026-09-01', endDate: '2026-09-15' },
  }
}

describe('buildTimeline', () => {
  it('shows a flights add-slot and a stay when only a stay is added', () => {
    const trip: TripState = {
      ...base(),
      stays: [
        {
          id: 's1', name: "Guido's Apartments", source: 'airbnb',
          pricePerNight: 100, nights: 14, photos: ['p.jpg'], bookUrl: 'https://air/1',
        },
      ],
    }
    const tl = buildTimeline(trip)
    expect(tl.headerLabel).toBe('Tenerife · Sep 1 – 15')
    const arrival = tl.groups[0]
    expect(arrival.addSlots).toContain('flights')
    const stayItem = arrival.items.find((i) => i.kind === 'stay')
    expect(stayItem?.title).toBe("Guido's Apartments")
    expect(stayItem?.price).toBe(1400) // pricePerNight * nights
    expect(stayItem?.priceUnit).toBe('total')
    expect(stayItem?.bookLabel).toBe('Book on Airbnb')
    // no activities anywhere → arrival group offers an activities add-slot
    expect(arrival.addSlots).toContain('activities')
  })

  it('places the outbound flight in arrival and the return flight in its own group', () => {
    const trip: TripState = {
      ...base(),
      flights: [
        { id: 'f1', from: 'SKP', to: 'TFN', price: 500, stops: 2, bookUrl: 'x', departTime: '3:10 PM', arriveTime: '5:00 PM' },
        { id: 'f2', from: 'TFN', to: 'SKP', price: 500, stops: 2, bookUrl: 'y', departTime: '9:55 AM', arriveTime: '2:10 AM' },
      ],
    }
    const tl = buildTimeline(trip)
    expect(tl.groups[0].items.some((i) => i.kind === 'flight' && i.id === 'f1')).toBe(true)
    expect(tl.groups[0].addSlots).not.toContain('flights')
    const ret = tl.groups[tl.groups.length - 1]
    expect(ret.items.some((i) => i.kind === 'flight' && i.id === 'f2')).toBe(true)
  })

  it('creates a dated group per activity day', () => {
    const trip: TripState = {
      ...base(),
      days: [
        { date: '2026-09-06', items: [{ placeId: 'a1', name: 'Whale watching' }] },
      ],
    }
    const tl = buildTimeline(trip)
    const actGroup = tl.groups.find((g) => g.label === 'Sun, Sep 6')
    expect(actGroup?.items[0]).toMatchObject({ kind: 'activity', title: 'Whale watching' })
  })

  it('falls back to "Your trip" header when dates are unparseable', () => {
    const trip: TripState = { ...createTrip('t2'), meta: { travelers: 1 } }
    expect(buildTimeline(trip).headerLabel).toBe('Your trip')
  })
})
