import type { TripState } from './types'
import { formatDateRange, nightsBetween } from './dates'
import { formatMoney, formatDuration, formatStops } from '../ui/format'
import { planConnections } from './connections'

/**
 * The finished trip, said back to the traveler step by step.
 *
 * Written here rather than asked of the model, and that is the whole point. This is the moment the
 * traveler stops planning and starts trusting the answer, so every line has to come from what is
 * actually in the plan — a recap with an invented price or a flight nobody chose is worse than no
 * recap at all. The model is good at conversation; it is not the record.
 */
export interface TripRecap {
  title: string
  /** One line under the title: where, when, how many. */
  subtitle: string
  /** The trip in order, one step per line, in the traveler's own terms. */
  steps: string[]
  /** What it adds up to, or undefined when nothing in the plan carries a price. */
  total?: string
}

function travelers(trip: TripState): string {
  const count = trip.meta.travelers > 0 ? trip.meta.travelers : 1
  return `${count} traveler${count === 1 ? '' : 's'}`
}

/** "SKP → FCO on Mar 19, 07:15–09:05, Wizz Air, nonstop — $120" */
function flightLine(trip: TripState, index: number): string {
  const flight = trip.flights[index]
  const leg = flight.direction === 'return' ? 'Fly home' : 'Fly out'
  const when = [flight.departDate, [flight.departTime, flight.arriveTime].filter(Boolean).join('–')]
    .filter(Boolean)
    .join(', ')
  const how = [
    flight.airline,
    formatDuration(flight.durationMinutes),
    formatStops(flight.stops, flight.layovers?.map((l) => l.code)),
  ]
    .filter(Boolean)
    .join(', ')
  // The paired return of a round trip is priced at zero, so it says nothing about money.
  const price = flight.price > 0 ? formatMoney(flight.price * (trip.meta.travelers || 1)) : undefined
  return [`${leg}: ${flight.from} → ${flight.to}`, when, how, price].filter(Boolean).join(' · ')
}

function stayLine(trip: TripState, index: number): string {
  const stay = trip.stays[index]
  const nights = stay.nights || nightsBetween(trip.meta.startDate, trip.meta.endDate)
  const total = stay.totalPrice ?? stay.pricePerNight * stay.nights
  return [
    `Stay at ${stay.name}`,
    nights ? `${nights} night${nights === 1 ? '' : 's'}` : undefined,
    stay.address,
    total > 0 ? formatMoney(total) : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * The plan as an ordered list a traveler can read straight through.
 *
 * Order is travel order, not the order things were added: out, bed, days, home, and finally how to
 * get between them. That is the order somebody actually lives the trip in.
 */
export function tripRecap(trip: TripState): TripRecap {
  const where = trip.meta.destination
  const title = trip.meta.title ?? (where ? `${where} trip` : 'Your trip')
  const range = formatDateRange(trip.meta.startDate, trip.meta.endDate)
  const subtitle = [where, range, travelers(trip)].filter(Boolean).join(' · ')

  const steps: string[] = []

  trip.flights.forEach((flight, i) => {
    if (flight.direction !== 'return') steps.push(flightLine(trip, i))
  })
  trip.stays.forEach((_, i) => steps.push(stayLine(trip, i)))

  const activities = trip.days.flatMap((day) => day.items)
  for (const item of activities) {
    steps.push([`Do: ${item.name}`, item.category, item.address].filter(Boolean).join(' · '))
  }

  trip.flights.forEach((flight, i) => {
    if (flight.direction === 'return') steps.push(flightLine(trip, i))
  })

  // Named rather than timed: the real durations live in the plan panel, and repeating a number here
  // would mean holding two copies of it that can disagree.
  const hops = planConnections(trip)
  if (hops.length > 0) {
    steps.push(
      `Getting around: ${hops.length} journey${hops.length === 1 ? '' : 's'} between these, with times in your plan`,
    )
  }

  const total = trip.estimatedTotal > 0 ? formatMoney(trip.estimatedTotal) : undefined
  return { title, subtitle, steps, total }
}
