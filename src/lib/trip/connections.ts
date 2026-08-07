import type { Coords, Flight, Stay, TripState } from './types'
import { asPoint } from './geo'

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
  /**
   * Other ways of naming each end, tried in order when the first returns no route.
   *
   * A directions engine answers a *question*, and an unresolvable name is a bad question rather than
   * a journey with no route — which is exactly how the plan came to say "no route came back" about
   * hops Google Maps happily routes. Coordinates and the full street address are the descriptions
   * that survive a name the geocoder cannot place.
   */
  fromAlternates?: string[]
  toAlternates?: string[]
  /** What this hop is for, in the traveler's terms. */
  label: string
}

/** `lat,lng`, which a directions engine takes verbatim and cannot misread. */
function asCoords(coords: Coords | undefined): string | undefined {
  return coords ? asPoint(coords) : undefined
}

/**
 * Every way of naming a place, best first: the name with enough locality to be unambiguous, the
 * coordinates, and the plain street address.
 */
function describe(place: {
  name: string
  address?: string
  coords?: Coords
}): { primary: string; alternates: string[] } {
  const locality = place.address?.split(',').pop()?.trim()
  const primary = [place.name, locality].filter(Boolean).join(', ')
  const alternates = [asCoords(place.coords), place.address, place.name].filter(
    (value): value is string => Boolean(value) && value !== primary,
  )
  return { primary, alternates: [...new Set(alternates)] }
}

/**
 * The airport a flight touches, as a place a directions engine will recognise.
 *
 * The provider gives us the airport's real name on the segment — "Tenerife South Airport" — and that
 * resolves far more reliably than a three-letter code, so it leads where we have it. The code stays
 * as the alternate, and as the answer for trips saved before segments were carried.
 */
function airport(code: string, name: string | undefined): { primary: string; alternates: string[] } {
  const label = `${code} airport`
  return name && name !== code
    ? { primary: name, alternates: [label] }
    : { primary: label, alternates: [] }
}

/** The name the provider gave the airport a flight arrives at. */
function arrivalAirportName(flight: Flight): string | undefined {
  return flight.segments?.[flight.segments.length - 1]?.toName
}

/** The name the provider gave the airport a flight departs from. */
function departureAirportName(flight: Flight): string | undefined {
  return flight.segments?.[0]?.fromName
}

function stayEnd(stay: Stay): { primary: string; alternates: string[] } {
  return describe({ name: stay.name, address: stay.address, coords: stay.coords })
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
  const home = stayEnd(stay)

  const outbound = trip.flights.find((f) => f.direction !== 'return')
  if (outbound) {
    const end = airport(outbound.to, arrivalAirportName(outbound))
    connections.push({
      key: `arrive:${outbound.id}:${stay.id}`,
      from: end.primary,
      fromAlternates: end.alternates,
      to: home.primary,
      toAlternates: home.alternates,
      label: 'Airport to your stay',
    })
  }

  for (const day of trip.days) {
    for (const item of day.items) {
      const there = describe({ name: item.name, address: item.address, coords: item.coords })
      connections.push({
        key: `visit:${stay.id}:${item.placeId}`,
        from: home.primary,
        fromAlternates: home.alternates,
        to: there.primary,
        toAlternates: there.alternates,
        label: `Your stay to ${item.name}`,
      })
    }
  }

  // The way back, which is a different journey: a 6am departure is not the arrival in reverse.
  const homeward = trip.flights.find((f) => f.direction === 'return')
  if (homeward) {
    const end = airport(homeward.from, departureAirportName(homeward))
    connections.push({
      key: `depart:${stay.id}:${homeward.id}`,
      from: home.primary,
      fromAlternates: home.alternates,
      to: end.primary,
      toAlternates: end.alternates,
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

/** The two ends of a journey, each with the other ways it can be named. */
export interface NamedJourney {
  from: string
  to: string
  fromAlternates?: string[]
  toAlternates?: string[]
}

/**
 * The ways of naming one journey, best first, for the directions engine to work through.
 *
 * Paired index by index rather than every combination: a bad name is almost always one end, and
 * asking about nine variants of a journey to find that out would cost nine provider calls.
 */
export function connectionCandidates(journey: NamedJourney): { from: string; to: string }[] {
  const froms = [journey.from, ...(journey.fromAlternates ?? [])]
  const tos = [journey.to, ...(journey.toAlternates ?? [])]
  const depth = Math.max(froms.length, tos.length)
  return Array.from({ length: depth }, (_, i) => ({
    from: froms[Math.min(i, froms.length - 1)],
    to: tos[Math.min(i, tos.length - 1)],
  }))
}

/** Everything in the plan a free-text end might be referring to, with the location we hold for it. */
function planPlaces(trip: TripState): { name: string; address?: string; coords?: Coords }[] {
  return [
    ...trip.stays.map((stay) => ({ name: stay.name, address: stay.address, coords: stay.coords })),
    ...trip.days.flatMap((day) =>
      day.items.map((item) => ({ name: item.name, address: item.address, coords: item.coords })),
    ),
  ]
}

/**
 * The ways of naming a journey the *agent* asked about, enriched from the plan.
 *
 * The agent types names; the plan holds coordinates and street addresses for the same places. Without
 * this, its own transfer lookups had one description to work with while the plan panel had three —
 * which is why the panel could answer a hop the concierge had just called unroutable.
 *
 * Matching is loose on purpose: the agent writes "Hotel Artemide" or "Hotel Artemide, Rome" for an
 * entry stored as "Hotel Artemide Rome Centre", and either should find the coordinates we hold. Three
 * characters is the floor — a shorter fragment would match half the plan, which is worse than nothing.
 */
export function journeyCandidates(
  trip: TripState,
  from: string,
  to: string,
): { from: string; to: string }[] {
  const known = planPlaces(trip)

  const end = (name: string) => {
    const asked = name.toLowerCase().trim()
    const match =
      asked.length < 3
        ? undefined
        : known.find((place) => {
            const stored = place.name.toLowerCase()
            return stored === asked || stored.includes(asked) || asked.includes(stored)
          })
    // The agent's own wording leads: it is what the traveler was just told, and it usually routes.
    if (!match) return { primary: name, alternates: [] as string[] }
    const described = describe(match)
    return {
      primary: name,
      alternates: [described.primary, ...described.alternates].filter((value) => value !== name),
    }
  }

  const start = end(from)
  const finish = end(to)
  return connectionCandidates({
    from: start.primary,
    fromAlternates: start.alternates,
    to: finish.primary,
    toAlternates: finish.alternates,
  })
}
