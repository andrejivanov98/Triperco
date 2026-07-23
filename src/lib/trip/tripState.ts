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
