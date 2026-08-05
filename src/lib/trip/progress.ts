import type { TripState } from './types'

export interface TripStep {
  key: 'destination' | 'transport' | 'stay'
  label: string
  added: number
  target: number
  done: boolean
}

export interface TripProgress {
  steps: TripStep[]
  added: number
  target: number
  /** True once every step is met. */
  complete: boolean
}

/** A return trip needs two legs; a one-way needs one. */
function transportTarget(trip: TripState): number {
  if (trip.flights.some((f) => f.direction === 'return' || f.returnLeg)) return 2
  const { startDate, endDate } = trip.meta
  return startDate && endDate && startDate !== endDate ? 2 : 1
}

/**
 * Whether the traveler has settled where they are going.
 *
 * Not just `meta.destination`: that is only set when the agent remembers to record it, and it was
 * routinely empty while the plan already held a hotel in Rome and a flight into Fiumicino. The panel
 * then showed "Where to" unticked and offered "Help me pick where to go" to somebody who had
 * plainly already picked.
 *
 * Anything in the plan is a decision about where to go, so anything in the plan settles this.
 */
export function hasDestination(trip: TripState): boolean {
  if (trip.meta.destination) return true
  if (trip.stays.length > 0 || trip.flights.length > 0) return true
  return trip.days.some((day) => day.items.length > 0)
}

/**
 * What is still missing, as counts rather than a checklist.
 *
 * The plan panel used to say nothing when empty, which left the traveler to guess what a finished
 * trip even looks like. This says it: somewhere to go, a way there and back, a bed.
 */
export function tripProgress(trip: TripState): TripProgress {
  const transport = transportTarget(trip)
  const decided = hasDestination(trip)
  const steps: TripStep[] = [
    {
      key: 'destination',
      label: 'Where to',
      added: decided ? 1 : 0,
      target: 1,
      done: decided,
    },
    {
      key: 'transport',
      label: 'Getting there',
      added: Math.min(trip.flights.length, transport),
      target: transport,
      done: trip.flights.length >= transport,
    },
    {
      key: 'stay',
      label: 'Somewhere to sleep',
      added: Math.min(trip.stays.length, 1),
      target: 1,
      done: trip.stays.length >= 1,
    },
  ]

  const added = steps.reduce((sum, step) => sum + step.added, 0)
  const target = steps.reduce((sum, step) => sum + step.target, 0)
  return { steps, added, target, complete: steps.every((step) => step.done) }
}

/** What to ask the chat for, to close the first gap. Nothing when the trip is covered. */
export function nextGapPrompt(trip: TripState): string | undefined {
  const { steps } = tripProgress(trip)
  const gap = steps.find((step) => !step.done)
  if (!gap) return undefined
  if (gap.key === 'destination') return 'Help me pick where to go'
  if (gap.key === 'transport') {
    return gap.added === 0 ? 'Find me flights' : 'Now find the flight home'
  }
  return 'Find me somewhere to stay'
}
