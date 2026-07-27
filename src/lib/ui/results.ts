import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { TriperUIMessage } from './messages'

/** A set of search results surfaced to the chat UI. Carries full domain objects. */
export type ResultSet =
  | {
      kind: 'flights'
      query?: string
      items: Flight[]
      /** Whether these are one-ways, round trips, or just the way home. */
      flightType?: 'one_way' | 'round_trip' | 'return'
    }
  | { kind: 'stays'; query?: string; items: Stay[] }
  | { kind: 'places'; query?: string; items: Place[] }

/** All data-results parts on a message, in order. */
export function getResultSets(message: TriperUIMessage): ResultSet[] {
  return message.parts
    .filter((p): p is { type: 'data-results'; data: ResultSet } => p.type === 'data-results')
    .map((p) => p.data)
}
