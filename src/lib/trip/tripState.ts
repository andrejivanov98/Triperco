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

/**
 * Adding is idempotent: the traveler can tap "Add to trip" while the agent adds the same thing
 * server-side, and the trip round-trips through both. A second add replaces the existing entry
 * (the newer copy is usually the enriched one) instead of duplicating it and doubling the total.
 */
function upsertById<T extends { id: string }>(list: T[], entry: T): T[] {
  const index = list.findIndex((existing) => existing.id === entry.id)
  if (index === -1) return [...list, entry]
  const next = [...list]
  next[index] = entry
  return next
}

export function addFlight(trip: TripState, flight: Flight): TripState {
  return withTotal({ ...trip, flights: upsertById(trip.flights, flight) })
}

export function removeFlight(trip: TripState, flightId: string): TripState {
  return withTotal({
    ...trip,
    flights: trip.flights.filter((f) => f.id !== flightId),
  })
}

export function addStay(trip: TripState, stay: Stay): TripState {
  return withTotal({ ...trip, stays: upsertById(trip.stays, stay) })
}

export function removeStay(trip: TripState, stayId: string): TripState {
  return withTotal({
    ...trip,
    stays: trip.stays.filter((s) => s.id !== stayId),
  })
}

export function addItineraryItem(
  trip: TripState,
  dayIndex: number,
  item: ItineraryItem,
): TripState {
  const days = trip.days.map((d) => ({ ...d, items: [...d.items] }))
  while (days.length <= dayIndex) days.push({ items: [] })

  // One entry per place per day — the same place on another day is still fine.
  const items = days[dayIndex].items
  const existing = items.findIndex((it) => it.placeId === item.placeId)
  if (existing === -1) items.push(item)
  else items[existing] = item

  return withTotal({ ...trip, days })
}

export function removeItineraryItem(
  trip: TripState,
  dayIndex: number,
  placeId: string,
): TripState {
  const days = trip.days.map((d, i) =>
    i === dayIndex
      ? { ...d, items: d.items.filter((it) => it.placeId !== placeId) }
      : d,
  )
  return withTotal({ ...trip, days })
}
