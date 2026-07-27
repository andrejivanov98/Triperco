import { describe, it, expect } from 'vitest'
import { bookableItems, bookingTotal, bookingProgress, BOOKING_LABEL } from './booking'
import { createTrip } from './tripState'
import type { TripState } from './types'

function trip(): TripState {
  return {
    ...createTrip('t1'),
    meta: { travelers: 2, destination: 'Ljubljana', startDate: '2026-08-07', endDate: '2026-08-10' },
    flights: [
      {
        id: 'f1',
        from: 'SKP',
        to: 'LJU',
        airline: 'Wizz Air',
        price: 120,
        stops: 0,
        bookUrl: 'https://google.com/flights',
        departDate: '2026-08-07',
      },
      {
        id: 'f2',
        from: 'LJU',
        to: 'SKP',
        airline: 'Wizz Air',
        price: 110,
        stops: 0,
        bookUrl: 'https://google.com/flights',
        departDate: '2026-08-10',
      },
    ],
    stays: [
      {
        id: 's1',
        name: 'City residence apartment',
        source: 'hotel',
        kind: 'vacation_rental',
        pricePerNight: 326,
        nights: 3,
        totalPrice: 979,
        photos: ['https://p/1'],
        bookUrl: 'https://airbnb.com/rooms/1',
        offers: [{ source: 'Airbnb', url: 'https://airbnb.com/rooms/1', official: true }],
      },
    ],
    days: [{ date: '2026-08-08', items: [{ placeId: 'p1', name: 'Small Group City Tour' }] }],
    estimatedTotal: 1439,
  }
}

describe('bookableItems', () => {
  it('lists flights, stays and activities in trip order', () => {
    const items = bookableItems(trip())
    expect(items.map((i) => i.kind)).toEqual(['flight', 'flight', 'stay', 'activity'])
  })

  it('names the partner the traveler books with', () => {
    const items = bookableItems(trip())
    expect(items[0].partner).toBe('Wizz Air')
    expect(items.find((i) => i.kind === 'stay')?.partner).toBe('Airbnb')
  })

  it('prices flights for the whole party', () => {
    const items = bookableItems(trip())
    expect(items[0].price).toBe(240) // 120 × 2 travelers
  })

  it('uses the provider total for a stay', () => {
    expect(bookableItems(trip()).find((i) => i.kind === 'stay')?.price).toBe(979)
  })

  it('labels each row with useful context', () => {
    const items = bookableItems(trip())
    expect(items[0].detail).toContain('Outbound')
    expect(items[1].detail).toContain('Return')
    const stay = items.find((i) => i.kind === 'stay')!
    expect(stay.detail).toContain('3 nights')
    expect(stay.detail).toContain('2 guests')
    expect(stay.detail).toContain('Aug 7 – 10')
  })

  it('starts everything as not booked and carries a link', () => {
    for (const item of bookableItems(trip())) {
      expect(item.status).toBe('not_booked')
      expect(item.bookUrl).toBeTruthy()
    }
  })

  it('reflects an already-booked stay', () => {
    const t = trip()
    t.stays[0].bookingStatus = 'booked'
    expect(bookableItems(t).find((i) => i.kind === 'stay')?.status).toBe('booked')
  })

  it('falls back to the host name when there is no airline', () => {
    const t = trip()
    t.flights = [{ id: 'f1', from: 'A', to: 'B', price: 10, stops: 0, bookUrl: 'https://www.kiwi.com/x' }]
    expect(bookableItems(t)[0].partner).toBe('Kiwi.com')
  })

  it('gives every row a unique key', () => {
    const keys = bookableItems(trip()).map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('is empty for an empty trip', () => {
    expect(bookableItems(createTrip('empty'))).toEqual([])
  })
})

describe('bookingTotal', () => {
  it('adds up what is still to pay', () => {
    // 240 + 220 outbound/return + 979 stay; the activity has no price.
    expect(bookingTotal(bookableItems(trip()))).toBe(1439)
  })

  it('is zero with nothing to book', () => {
    expect(bookingTotal([])).toBe(0)
  })
})

describe('bookingProgress', () => {
  it('counts how much is done', () => {
    const t = trip()
    t.stays[0].bookingStatus = 'booked'
    expect(bookingProgress(bookableItems(t))).toEqual({ done: 1, total: 4 })
  })
})

describe('BOOKING_LABEL', () => {
  it('reads plainly', () => {
    expect(BOOKING_LABEL.not_booked).toBe('Not booked')
    expect(BOOKING_LABEL.confirmed).toBe('Confirmed')
  })
})
