import type { TripState } from './types'

/**
 * Every id already in the plan — flights (including the return leg of a round trip), stays, and
 * things to do.
 *
 * The cards need this so an Add button can say "Added" and stop inviting a second press. Adding is
 * idempotent underneath, so a repeat press does no damage; the problem is that it gives no feedback,
 * and a button that looks the same before and after leaves you unsure whether it registered.
 */
export function plannedIds(trip: TripState): Set<string> {
  const ids = new Set<string>()

  for (const flight of trip.flights) {
    ids.add(flight.id)
    // A round trip is one card but two legs; the card's id is the outbound's.
    if (flight.returnLeg) ids.add(flight.returnLeg.id)
  }
  for (const stay of trip.stays) ids.add(stay.id)
  for (const day of trip.days) {
    for (const item of day.items) ids.add(item.placeId)
  }

  return ids
}
