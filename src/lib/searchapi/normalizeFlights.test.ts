import { describe, it, expect } from 'vitest'
import { normalizeFlights, type RawFlightsResponse } from './normalizeFlights'

const raw: RawFlightsResponse = {
  best_flights: [
    {
      price: 180,
      total_duration: 130,
      booking_token: 'tok_abc',
      flights: [
        {
          airline: 'Wizz Air',
          flight_number: 'W6 1234',
          departure_airport: { id: 'SKP', name: 'Skopje', time: '10:00', date: '2026-05-01' },
          arrival_airport: { id: 'FCO', name: 'Rome', time: '12:10', date: '2026-05-01' },
          duration: 130,
        },
      ],
      layovers: [],
    },
  ],
  other_flights: [
    {
      price: 150,
      total_duration: 300,
      flights: [
        {
          airline: 'ITA',
          flight_number: 'AZ 1',
          departure_airport: { id: 'SKP', name: 'Skopje', time: '06:00', date: '2026-05-01' },
          arrival_airport: { id: 'VIE', name: 'Vienna', time: '07:00', date: '2026-05-01' },
          duration: 60,
        },
        {
          airline: 'ITA',
          flight_number: 'AZ 2',
          departure_airport: { id: 'VIE', name: 'Vienna', time: '09:00', date: '2026-05-01' },
          arrival_airport: { id: 'FCO', name: 'Rome', time: '10:30', date: '2026-05-01' },
          duration: 90,
        },
      ],
      layovers: [{ duration: 120, name: 'Vienna', id: 'VIE' }],
    },
  ],
}

describe('normalizeFlights', () => {
  it('flattens best_flights + other_flights into Flight[]', () => {
    const flights = normalizeFlights(raw)
    expect(flights).toHaveLength(2)
  })

  it('maps a nonstop itinerary correctly', () => {
    const f = normalizeFlights(raw)[0]
    expect(f.id).toBe('tok_abc')
    expect(f.from).toBe('SKP')
    expect(f.to).toBe('FCO')
    expect(f.airline).toBe('Wizz Air')
    expect(f.departTime).toBe('10:00')
    expect(f.arriveTime).toBe('12:10')
    expect(f.durationMinutes).toBe(130)
    expect(f.stops).toBe(0)
    expect(f.price).toBe(180)
    expect(f.bookUrl).toContain('google.com/travel/flights')
  })

  it('derives stops and endpoints for a connecting itinerary', () => {
    const f = normalizeFlights(raw)[1]
    expect(f.from).toBe('SKP')
    expect(f.to).toBe('FCO')
    expect(f.stops).toBe(1)
    expect(f.id).toBe('AZ 1-AZ 2') // no booking_token -> flight numbers joined
  })

  it('returns [] when there are no flights', () => {
    expect(normalizeFlights({})).toEqual([])
  })
})
