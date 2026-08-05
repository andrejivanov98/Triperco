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

/**
 * The secret that permits replacing an already-shared trip.
 *
 * A share id is, by definition, known to everyone who has the link — so it cannot also be the proof
 * that you are allowed to overwrite what is behind it. Without this, anyone holding a link to someone
 * else's trip could replace its contents for every other person holding that link.
 *
 * Held only by the session that created the trip, and never returned by `load`, so it never reaches
 * a reader.
 */
export function newWriteToken(): string {
  return crypto.randomUUID()
}

export interface TripStore {
  save(trip: TripState): Promise<string>
  load(id: string): Promise<TripState | null>
  /** Remember the secret that lets this id be updated later. */
  putToken(id: string, token: string): Promise<void>
  /** The stored secret for an id, or null when there is none. */
  getToken(id: string): Promise<string | null>
}

/**
 * In-memory store for tests and local dev.
 *
 * Tokens live in their own map rather than inside the trip, so there is no path by which one could
 * be serialized into a response — the type simply has nowhere to carry it.
 */
export function createInMemoryTripStore(): TripStore {
  const map = new Map<string, string>()
  const tokens = new Map<string, string>()
  return {
    async save(trip) {
      map.set(trip.id, serializeTrip(trip))
      return trip.id
    },
    async load(id) {
      const raw = map.get(id)
      return raw ? deserializeTrip(raw) : null
    },
    async putToken(id, token) {
      tokens.set(id, token)
    },
    async getToken(id) {
      return tokens.get(id) ?? null
    },
  }
}
