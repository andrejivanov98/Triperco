import { describe, it, expect } from 'vitest'
import { stayBookingLink, stayBookingLinkFromTrip } from './bookingLink'
import type { Stay } from './types'

function stay(name = 'Hotel Vander'): Stay {
  return {
    id: 's1',
    name,
    source: 'hotel',
    pricePerNight: 140,
    nights: 3,
    photos: [],
    bookUrl: 'https://opaque.example/redirect/AbC123',
  }
}

const dates = { checkIn: '2026-09-15', checkOut: '2026-09-18', adults: 2, children: 1, rooms: 2 }

describe('stayBookingLink — Booking.com', () => {
  it('arrives with the property, the dates and the party already filled in', () => {
    const link = stayBookingLink(stay(), dates, 'Booking.com')
    const url = new URL(link.url)
    expect(url.hostname).toBe('www.booking.com')
    expect(url.searchParams.get('ss')).toBe('Hotel Vander')
    expect(url.searchParams.get('checkin')).toBe('2026-09-15')
    expect(url.searchParams.get('checkout')).toBe('2026-09-18')
    expect(url.searchParams.get('group_adults')).toBe('2')
    expect(url.searchParams.get('group_children')).toBe('1')
    expect(url.searchParams.get('no_rooms')).toBe('2')
    expect(link).toMatchObject({ provider: 'Booking.com', dated: true })
  })

  it('recognises the provider from the link when the name is missing', () => {
    const link = stayBookingLink(stay(), dates, undefined, 'https://www.booking.com/hotel/x.html')
    expect(link.provider).toBe('Booking.com')
  })

  it('defaults to one room rather than omitting it', () => {
    const link = stayBookingLink(stay(), { checkIn: '2026-09-15', checkOut: '2026-09-18' }, 'Booking.com')
    expect(new URL(link.url).searchParams.get('no_rooms')).toBe('1')
  })
})

describe('stayBookingLink — Airbnb', () => {
  it('puts the property in the path and the stay in the query', () => {
    const link = stayBookingLink(stay('City Residence Apartment'), dates, 'Airbnb')
    const url = new URL(link.url)
    expect(url.hostname).toBe('www.airbnb.com')
    expect(url.pathname).toBe('/s/City%20Residence%20Apartment/homes')
    expect(url.searchParams.get('checkin')).toBe('2026-09-15')
    expect(url.searchParams.get('adults')).toBe('2')
  })
})

describe('stayBookingLink — Expedia family', () => {
  it('uses the shared parameter names', () => {
    const link = stayBookingLink(stay(), dates, 'Hotels.com')
    const url = new URL(link.url)
    expect(url.hostname).toBe('www.hotels.com')
    expect(url.searchParams.get('destination')).toBe('Hotel Vander')
    expect(url.searchParams.get('startDate')).toBe('2026-09-15')
    expect(url.searchParams.get('endDate')).toBe('2026-09-18')
  })

  it('sends Expedia to its own domain', () => {
    expect(new URL(stayBookingLink(stay(), dates, 'Expedia').url).hostname).toBe('www.expedia.com')
  })
})

describe('stayBookingLink — unknown providers', () => {
  it('falls back to Google Hotels rather than inventing parameters', () => {
    const link = stayBookingLink(stay(), dates, 'freecancellations.com')
    const url = new URL(link.url)
    expect(url.hostname).toBe('www.google.com')
    expect(url.pathname).toBe('/travel/search')
    expect(url.searchParams.get('q')).toBe('Hotel Vander')
    expect(url.searchParams.get('checkin')).toBe('2026-09-15')
    expect(link.provider).toBe('Google Hotels')
  })

  it('still builds a usable link when there are no dates yet', () => {
    const link = stayBookingLink(stay(), {}, 'Booking.com')
    const url = new URL(link.url)
    expect(url.searchParams.get('ss')).toBe('Hotel Vander')
    expect(url.searchParams.has('checkin')).toBe(false)
    expect(link.dated).toBe(false)
  })

  it('ignores a date that is not a date', () => {
    const link = stayBookingLink(stay(), { checkIn: 'next Tuesday', checkOut: '2026-09-18' }, 'Booking.com')
    expect(new URL(link.url).searchParams.has('checkin')).toBe(false)
    expect(link.dated).toBe(false)
  })

  it('keeps the provider link when the property has no name to search for', () => {
    const link = stayBookingLink({ ...stay(), name: '  ' }, dates, 'Booking.com', 'https://x.example/y')
    expect(link.url).toBe('https://x.example/y')
    expect(link.dated).toBe(false)
  })
})

describe('stayBookingLinkFromTrip', () => {
  it('reads the dates and party straight off the trip', () => {
    const link = stayBookingLinkFromTrip(
      stay(),
      { startDate: '2026-09-15', endDate: '2026-09-18', travelers: 3, rooms: 2 },
      'Booking.com',
    )
    const url = new URL(link.url)
    expect(url.searchParams.get('checkin')).toBe('2026-09-15')
    expect(url.searchParams.get('group_adults')).toBe('3')
    expect(url.searchParams.get('no_rooms')).toBe('2')
  })

  it('prefers an explicit adult count over the headcount', () => {
    const link = stayBookingLinkFromTrip(
      stay(),
      { startDate: '2026-09-15', endDate: '2026-09-18', travelers: 4, adults: 2, children: 2 },
      'Booking.com',
    )
    expect(new URL(link.url).searchParams.get('group_adults')).toBe('2')
  })
})
