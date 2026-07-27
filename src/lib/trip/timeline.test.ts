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

  it('dates each day group from the trip dates, so day 0 is the first day', () => {
    const trip: TripState = {
      ...base(), // Sep 1 – 15
      days: [{ items: [{ placeId: 'a1', name: 'Whale watching' }] }],
    }
    const tl = buildTimeline(trip)
    const actGroup = tl.groups.find((g) => g.label === 'Tue, Sep 1')
    expect(actGroup?.items.find((i) => i.kind === 'activity')).toMatchObject({
      title: 'Whale watching',
    })
  })

  it('falls back to a day\'s own date when the trip has none', () => {
    const trip: TripState = {
      ...createTrip('t4'),
      meta: { travelers: 1, destination: 'Rome' },
      days: [
        { items: [{ placeId: 'a1', name: 'Arrival stroll' }] },
        { date: '2026-09-06', items: [{ placeId: 'a2', name: 'Whale watching' }] },
      ],
    }
    expect(buildTimeline(trip).groups.map((g) => g.label)).toContain('Sun, Sep 6')
  })

  it('falls back to "Your trip" header when dates are unparseable', () => {
    const trip: TripState = { ...createTrip('t2'), meta: { travelers: 1 } }
    expect(buildTimeline(trip).headerLabel).toBe('Your trip')
  })

  it('offers a stays slot until a stay is added', () => {
    expect(buildTimeline(base()).groups[0].addSlots).toContain('stays')
    const withStay: TripState = {
      ...base(),
      stays: [
        {
          id: 's1', name: 'Apt', source: 'airbnb',
          pricePerNight: 100, nights: 14, photos: [], bookUrl: 'x',
        },
      ],
    }
    expect(buildTimeline(withStay).groups[0].addSlots).not.toContain('stays')
  })

  it('offers a return-flight slot once an outbound flight exists', () => {
    const trip: TripState = {
      ...base(),
      flights: [{ id: 'f1', from: 'SKP', to: 'TFN', price: 500, stops: 0, bookUrl: 'x' }],
    }
    const last = buildTimeline(trip).groups[buildTimeline(trip).groups.length - 1]
    expect(last.addSlots).toContain('return-flight')
  })

  it('does not ask for a return flight before the outbound one is picked', () => {
    const slots = buildTimeline(base()).groups.flatMap((g) => g.addSlots)
    expect(slots).not.toContain('return-flight')
  })

  it('gives every day of a dated trip its own group with an activities slot', () => {
    const trip: TripState = {
      ...createTrip('t3'),
      meta: { travelers: 2, destination: 'Rome', startDate: '2026-09-01', endDate: '2026-09-03' },
    }
    const tl = buildTimeline(trip)
    // Sep 1, 2 and 3 each get a group.
    expect(tl.groups.filter((g) => g.addSlots.includes('activities'))).toHaveLength(3)
    expect(tl.groups.map((g) => g.label)).toEqual(['Tue, Sep 1', 'Wed, Sep 2', 'Thu, Sep 3'])
  })

  it('tags each activity with the day it belongs to, so it can be removed', () => {
    const trip: TripState = {
      ...base(),
      days: [
        { date: '2026-09-01', items: [{ placeId: 'a1', name: 'Old town walk' }] },
        { date: '2026-09-02', items: [{ placeId: 'a2', name: 'Whale watching' }] },
      ],
    }
    const items = buildTimeline(trip).groups.flatMap((g) => g.items)
    expect(items.find((i) => i.id === 'a1')?.dayIndex).toBe(0)
    expect(items.find((i) => i.id === 'a2')?.dayIndex).toBe(1)
  })
})
