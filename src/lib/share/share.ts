import type { TripState } from '../trip/types'

export function serializeTrip(trip: TripState): string {
  return JSON.stringify(trip)
}

export function deserializeTrip(json: string): TripState {
  const parsed = JSON.parse(json) as Partial<TripState>
  if (
    !parsed ||
    typeof parsed.id !== 'string' ||
    !Array.isArray(parsed.flights) ||
    !Array.isArray(parsed.stays) ||
    !Array.isArray(parsed.days) ||
    typeof parsed.meta !== 'object'
  ) {
    throw new Error('Invalid trip payload')
  }
  return parsed as TripState
}

export function newTripId(): string {
  return crypto.randomUUID()
}

export interface TripStore {
  save(trip: TripState): Promise<string>
  load(id: string): Promise<TripState | null>
}

/** In-memory store for tests and local dev. Real KV store lands in Plan 5. */
export function createInMemoryTripStore(): TripStore {
  const map = new Map<string, string>()
  return {
    async save(trip) {
      map.set(trip.id, serializeTrip(trip))
      return trip.id
    },
    async load(id) {
      const raw = map.get(id)
      return raw ? deserializeTrip(raw) : null
    },
  }
}
