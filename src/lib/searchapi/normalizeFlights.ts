import type { Flight } from '../trip/types'

interface RawAirport {
  id: string
  name?: string
  time?: string
  date?: string
}

interface RawSegment {
  airline?: string
  flight_number?: string
  departure_airport: RawAirport
  arrival_airport: RawAirport
  duration?: number
}

interface RawItinerary {
  price?: number
  total_duration?: number
  booking_token?: string
  flights: RawSegment[]
  layovers?: { duration?: number; name?: string; id?: string }[]
}

export interface RawFlightsResponse {
  best_flights?: RawItinerary[]
  other_flights?: RawItinerary[]
}

function googleFlightsUrl(from: string, to: string, date?: string): string {
  const q = `Flights from ${from} to ${to}${date ? ` on ${date}` : ''}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

function toFlight(itin: RawItinerary): Flight {
  const segments = itin.flights
  const first = segments[0]
  const last = segments[segments.length - 1]
  const from = first.departure_airport.id
  const to = last.arrival_airport.id
  const id =
    itin.booking_token ?? segments.map((s) => s.flight_number ?? '?').join('-')
  const stops = itin.layovers?.length ?? Math.max(0, segments.length - 1)
  return {
    id,
    from,
    to,
    airline: first.airline,
    departTime: first.departure_airport.time,
    arriveTime: last.arrival_airport.time,
    durationMinutes: itin.total_duration,
    stops,
    price: itin.price ?? 0,
    bookUrl: googleFlightsUrl(from, to, first.departure_airport.date),
  }
}

export function normalizeFlights(raw: RawFlightsResponse): Flight[] {
  const all = [...(raw.best_flights ?? []), ...(raw.other_flights ?? [])]
  return all.map(toFlight)
}
