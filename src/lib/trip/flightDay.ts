import type { Flight } from './types'

const DAY = 86_400_000

function parseDay(date: string | undefined): number | undefined {
  if (!date) return undefined
  const time = Date.parse(`${date.trim()}T00:00:00Z`)
  return Number.isNaN(time) ? undefined : time
}

/**
 * How many calendar days after departure this flight lands. 0 for same day, 1 for the red-eye that
 * arrives tomorrow.
 *
 * We showed both dates and left the traveler to work it out. Landing a day later changes which
 * night you need a bed for, so it deserves to be said rather than inferred.
 */
export function arrivalDayOffset(flight: Pick<Flight, 'departDate' | 'arriveDate'>): number {
  const from = parseDay(flight.departDate)
  const to = parseDay(flight.arriveDate)
  if (from === undefined || to === undefined) return 0
  const days = Math.round((to - from) / DAY)
  return days > 0 ? days : 0
}

export function arrivesNextDay(flight: Pick<Flight, 'departDate' | 'arriveDate'>): boolean {
  return arrivalDayOffset(flight) > 0
}

/** "+1 day" / "+2 days", or nothing when it lands the same day. */
export function arrivalDayLabel(flight: Pick<Flight, 'departDate' | 'arriveDate'>): string | undefined {
  const offset = arrivalDayOffset(flight)
  if (offset === 0) return undefined
  return `+${offset} day${offset === 1 ? '' : 's'}`
}
