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

const rich: RawFlightsResponse = {
  best_flights: [
    {
      price: 240,
      total_duration: 320,
      booking_token: 'tok_rich',
      carbon_emissions: { this_flight: 184000, difference_percent: -12 },
      extensions: ['Checked bag for a fee'],
      flights: [
        {
          airline: 'Lufthansa',
          airline_logo: 'https://logo/lh',
          flight_number: 'LH 1706',
          airplane: 'Airbus A320',
          travel_class: 'Economy',
          legroom: '30 in',
          extensions: ['Wi-Fi for a fee'],
          duration: 85,
          departure_airport: {
            id: 'SKP',
            name: 'Skopje International Airport',
            time: '06:15',
            date: '2026-05-01',
          },
          arrival_airport: {
            id: 'MUC',
            name: 'Munich International Airport',
            time: '07:40',
            date: '2026-05-01',
          },
        },
        {
          airline: 'Lufthansa',
          flight_number: 'LH 1846',
          duration: 140,
          departure_airport: { id: 'MUC', time: '09:15', date: '2026-05-01' },
          arrival_airport: { id: 'FCO', name: 'Rome Fiumicino', time: '00:35', date: '2026-05-02' },
        },
      ],
      layovers: [
        { id: 'MUC', name: 'Munich International Airport', duration: 95, overnight: true },
      ],
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

  it('keeps every segment with its airline, aircraft, cabin and airport names', () => {
    const f = normalizeFlights(rich)[0]
    expect(f.segments).toHaveLength(2)
    const [first, second] = f.segments!
    expect(first).toMatchObject({
      airline: 'Lufthansa',
      airlineLogo: 'https://logo/lh',
      flightNumber: 'LH 1706',
      aircraft: 'Airbus A320',
      cabin: 'Economy',
      legroom: '30 in',
      fromCode: 'SKP',
      fromName: 'Skopje International Airport',
      toCode: 'MUC',
      toName: 'Munich International Airport',
      departTime: '06:15',
      departDate: '2026-05-01',
      arriveTime: '07:40',
      durationMinutes: 85,
    })
    expect(first.extensions).toEqual(['Wi-Fi for a fee'])
    expect(second.flightNumber).toBe('LH 1846')
  })

  it('keeps layovers with duration and overnight flag', () => {
    const f = normalizeFlights(rich)[0]
    expect(f.layovers).toEqual([
      { code: 'MUC', name: 'Munich International Airport', durationMinutes: 95, overnight: true },
    ])
  })

  it('keeps carbon, booking token, dates and itinerary extensions', () => {
    const f = normalizeFlights(rich)[0]
    expect(f.carbonGrams).toBe(184000)
    expect(f.carbonVsTypical).toBe(-12)
    expect(f.bookingToken).toBe('tok_rich')
    expect(f.departDate).toBe('2026-05-01')
    expect(f.arriveDate).toBe('2026-05-02')
    expect(f.airlineLogo).toBe('https://logo/lh')
    expect(f.extensions).toEqual(['Checked bag for a fee'])
  })
})
