import type { TripState } from './types'
import { nightsBetween } from './dates'

export interface WatchoutFix {
  label: string
  prompt: string
}

export interface Watchout {
  id: string
  severity: 'info' | 'warning'
  message: string
  fixes: WatchoutFix[]
}

export function computeWatchouts(trip: TripState): Watchout[] {
  const out: Watchout[] = []
  const { meta, flights, stays } = trip

  // Stay length vs trip length.
  const tripNights = nightsBetween(meta.startDate, meta.endDate)
  if (tripNights !== undefined && stays.length > 0) {
    const stayNights = stays.reduce((n, s) => n + s.nights, 0)
    if (stayNights !== tripNights) {
      out.push({
        id: 'stay-nights-mismatch',
        severity: 'warning',
        message: `Your stay covers ${stayNights} night${stayNights === 1 ? '' : 's'}, but the trip is ${tripNights}.`,
        fixes: [{ label: 'Fix the dates', prompt: 'Adjust my stay dates to match the trip length.' }],
      })
    }
  }

  // Stay but no flights.
  if (stays.length > 0 && flights.length === 0) {
    out.push({
      id: 'no-flights',
      severity: 'info',
      message: "You haven't added flights yet.",
      fixes: [{ label: 'Look up flights', prompt: 'Look up flights for my trip.' }],
    })
  }

  // One-way only.
  if (flights.length === 1) {
    out.push({
      id: 'one-way',
      severity: 'info',
      message: 'Only one flight is added — do you want a return?',
      fixes: [{ label: 'Add a return', prompt: 'Find a return flight for my trip.' }],
    })
  }

  // Over budget.
  if (meta.budget !== undefined && meta.budget > 0 && trip.estimatedTotal > meta.budget) {
    out.push({
      id: 'over-budget',
      severity: 'warning',
      message: `Your plan is ${(trip.estimatedTotal - meta.budget).toLocaleString()} over your budget.`,
      fixes: [{ label: 'Find cheaper options', prompt: 'Suggest cheaper flights or stays to get back under my budget.' }],
    })
  }

  return out
}
