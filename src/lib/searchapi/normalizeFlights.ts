import type { Flight, FlightSegment, Layover } from '../trip/types'

interface RawAirport {
  id: string
  name?: string
  time?: string
  date?: string
}

interface RawSegment {
  airline?: string
  airline_logo?: string
  flight_number?: string
  airplane?: string
  travel_class?: string
  legroom?: string
  extensions?: string[]
  /** Parsed versions of `extensions`, e.g. { legroom: "30 in", carbon_emission: 61 }. */
  detected_extensions?: { legroom?: string; carbon_emission?: number }
  departure_airport: RawAirport
  arrival_airport: RawAirport
  duration?: number
}

interface RawLayover {
  duration?: number
  name?: string
  id?: string
  overnight?: boolean
}

interface RawItinerary {
  price?: number
  total_duration?: number
  booking_token?: string
  /** Present on a round-trip outbound: the handle for fetching that outbound's return options. */
  departure_token?: string
  flights: RawSegment[]
  layovers?: RawLayover[]
  carbon_emissions?: { this_flight?: number; difference_percent?: number }
  extensions?: string[]
  /** "One way" / "Round trip". */
  type?: string
}

export interface RawFlightsResponse {
  best_flights?: RawItinerary[]
  other_flights?: RawItinerary[]
}

function googleFlightsUrl(from: string, to: string, date?: string): string {
  const q = `Flights from ${from} to ${to}${date ? ` on ${date}` : ''}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

function toSegment(s: RawSegment): FlightSegment {
  return {
    airline: s.airline,
    airlineLogo: s.airline_logo,
    flightNumber: s.flight_number,
    aircraft: s.airplane,
    cabin: s.travel_class,
    legroom: s.legroom ?? s.detected_extensions?.legroom,
    fromCode: s.departure_airport.id,
    fromName: s.departure_airport.name,
    toCode: s.arrival_airport.id,
    toName: s.arrival_airport.name,
    departTime: s.departure_airport.time,
    departDate: s.departure_airport.date,
    arriveTime: s.arrival_airport.time,
    arriveDate: s.arrival_airport.date,
    durationMinutes: s.duration,
    extensions: s.extensions,
  }
}

function toLayover(l: RawLayover): Layover {
  return { code: l.id, name: l.name, durationMinutes: l.duration, overnight: l.overnight }
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
    airlineLogo: segments.find((s) => s.airline_logo)?.airline_logo,
    departTime: first.departure_airport.time,
    departDate: first.departure_airport.date,
    arriveTime: last.arrival_airport.time,
    arriveDate: last.arrival_airport.date,
    durationMinutes: itin.total_duration,
    stops,
    price: itin.price ?? 0,
    bookUrl: googleFlightsUrl(from, to, first.departure_airport.date),
    segments: segments.map(toSegment),
    layovers: (itin.layovers ?? []).map(toLayover),
    carbonGrams: itin.carbon_emissions?.this_flight,
    carbonVsTypical: itin.carbon_emissions?.difference_percent,
    bookingToken: itin.booking_token,
    extensions: itin.extensions,
    tripType: itin.type?.toLowerCase().includes('round') ? 'round_trip' : 'one_way',
  }
}

export function normalizeFlights(
  raw: RawFlightsResponse,
  direction: 'outbound' | 'return' = 'outbound',
): Flight[] {
  const all = [...(raw.best_flights ?? []), ...(raw.other_flights ?? [])]
  return all.map((itin) => ({ ...toFlight(itin), direction }))
}

/** The provider's handle for an outbound's return options, paired with the flight it belongs to. */
export function departureTokens(raw: RawFlightsResponse): { id: string; token: string }[] {
  const all = [...(raw.best_flights ?? []), ...(raw.other_flights ?? [])]
  return all
    .map((itin) => ({ id: toFlight(itin).id, token: itin.departure_token ?? '' }))
    .filter((entry) => entry.token !== '')
}
