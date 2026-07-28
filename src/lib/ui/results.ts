import type { ActivityKind, Flight, Stay, Place } from '@/lib/trip/types'
import type { TriperUIMessage } from './messages'

/**
 * A set of search results surfaced to the chat UI. Carries full domain objects.
 *
 * `setKey` identifies the question the search answers. Two sets sharing a key are the same
 * question asked twice, so the newer one supersedes the older rather than piling up beside it.
 */
export type ResultSet =
  | {
      kind: 'flights'
      query?: string
      setKey?: string
      items: Flight[]
      /** Whether these are one-ways, round trips, or just the way home. */
      flightType?: 'one_way' | 'round_trip' | 'return'
    }
  | { kind: 'stays'; query?: string; setKey?: string; items: Stay[] }
  | {
      kind: 'places'
      query?: string
      setKey?: string
      items: Place[]
      /** Things to do, tours or events — they are not the same offer and never share a carousel. */
      placeKind?: ActivityKind
    }

/** Collapse whitespace and case so "Rome " and "rome" are the same question. */
function normalizeQuery(query: string | undefined): string {
  return (query ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * The identity of the question a set answers. Falls back to the query when the server did not
 * supply a key, so threads created before keys existed still behave.
 */
export function resultSetKey(set: ResultSet): string {
  if (set.setKey && set.setKey.trim().length > 0) return set.setKey.trim()
  const query = normalizeQuery(set.query)
  if (set.kind === 'flights') return `flights:${query}:${set.flightType ?? 'one_way'}`
  if (set.kind === 'places') return `places:${query}:${set.placeKind ?? 'attraction'}`
  return `${set.kind}:${query}`
}

/** Build the key the server stamps on a set. */
export function makeSetKey(
  kind: ResultSet['kind'],
  query: string,
  variant?: 'one_way' | 'round_trip' | 'return' | ActivityKind,
): string {
  const base = `${kind}:${normalizeQuery(query)}`
  if (kind === 'flights') return `${base}:${variant ?? 'one_way'}`
  if (kind === 'places') return `${base}:${variant ?? 'attraction'}`
  return base
}

/** All data-results parts on a message, in order. */
export function getResultSets(message: TriperUIMessage): ResultSet[] {
  return message.parts
    .filter((p): p is { type: 'data-results'; data: ResultSet } => p.type === 'data-results')
    .map((p) => p.data)
}

/** Every result set in the thread, oldest first — the raw material for a screen snapshot. */
export function allResultSets(messages: TriperUIMessage[]): ResultSet[] {
  return messages.flatMap(getResultSets)
}
