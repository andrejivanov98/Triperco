import type { TripState } from './types'

/**
 * The journeys a plan implies but never states.
 *
 * A plan is a list of places, and the gaps between them are where trips actually go wrong: the
 * traveler discovers the "great value" apartment is 50 minutes and two changes from everything they
 * chose, on the morning they land. Naming each hop turns a list into an itinerary.
 */
export interface Connection {
  /** Stable across renders, so a fetched answer can be cached against it. */
  key: string
  from: string
  to: string
  /** What this hop is for, in the traveler's terms. */
  label: string
}

/** The airport a flight arrives at, as a place a directions engine will recognise. */
function airportName(code: string): string {
  return `${code} airport`
}

/**
 * Every leg worth showing, in travel order: the airport to the stay, the stay to each thing to do,
 * and the stay back to the airport.
 *
 * Deliberately anchored on the stay rather than chaining activity to activity. Nobody visits four
 * museums without going home in between, and a chain would invent an order the traveler never chose
 * — the plan explicitly does not assign things to days.
 */
export function planConnections(trip: TripState): Connection[] {
  const stay = trip.stays[0]
  if (!stay) return []

  const connections: Connection[] = []
  const stayName = [stay.name, stay.address?.split(',').pop()?.trim()].filter(Boolean).join(', ')

  const outbound = trip.flights.find((f) => f.direction !== 'return')
  if (outbound) {
    const airport = airportName(outbound.to)
    connections.push({
      key: `arrive:${outbound.id}:${stay.id}`,
      from: airport,
      to: stayName,
      label: 'Airport to your stay',
    })
  }

  for (const day of trip.days) {
    for (const item of day.items) {
      const to = [item.name, item.address?.split(',').pop()?.trim()].filter(Boolean).join(', ')
      connections.push({
        key: `visit:${stay.id}:${item.placeId}`,
        from: stayName,
        to,
        label: `Your stay to ${item.name}`,
      })
    }
  }

  // The way back, which is a different journey: a 6am departure is not the arrival in reverse.
  const homeward = trip.flights.find((f) => f.direction === 'return')
  if (homeward) {
    connections.push({
      key: `depart:${stay.id}:${homeward.id}`,
      from: stayName,
      to: airportName(homeward.from),
      label: 'Your stay to the airport',
    })
  }

  // One entry per journey: two activities at the same place is still one hop to learn about.
  const seen = new Set<string>()
  return connections.filter((c) => {
    const route = `${c.from}→${c.to}`.toLowerCase()
    if (seen.has(route) || c.from.toLowerCase() === c.to.toLowerCase()) return false
    seen.add(route)
    return true
  })
}
