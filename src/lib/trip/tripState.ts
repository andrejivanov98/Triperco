import type { TripState, TripMeta, Flight, Stay, ItineraryItem } from './types'

export function createTrip(id: string): TripState {
  return {
    id,
    meta: { travelers: 1 },
    flights: [],
    stays: [],
    days: [],
    estimatedTotal: 0,
  }
}

export function computeEstimatedTotal(trip: TripState): number {
  const travelers = trip.meta.travelers > 0 ? trip.meta.travelers : 1
  const flightsTotal =
    trip.flights.reduce((sum, f) => sum + f.price, 0) * travelers
  const staysTotal = trip.stays.reduce(
    (sum, s) => sum + s.pricePerNight * s.nights,
    0,
  )
  return flightsTotal + staysTotal
}

function withTotal(trip: TripState): TripState {
  return { ...trip, estimatedTotal: computeEstimatedTotal(trip) }
}

export function setMeta(trip: TripState, patch: Partial<TripMeta>): TripState {
  return withTotal({ ...trip, meta: { ...trip.meta, ...patch } })
}

export function addFlight(trip: TripState, flight: Flight): TripState {
  return withTotal({ ...trip, flights: [...trip.flights, flight] })
}

export function removeFlight(trip: TripState, flightId: string): TripState {
  return withTotal({
    ...trip,
    flights: trip.flights.filter((f) => f.id !== flightId),
  })
}

export function addStay(trip: TripState, stay: Stay): TripState {
  return withTotal({ ...trip, stays: [...trip.stays, stay] })
}

export function removeStay(trip: TripState, stayId: string): TripState {
  return withTotal({
    ...trip,
    stays: trip.stays.filter((s) => s.id !== stayId),
  })
}
