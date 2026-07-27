import type { UIMessage } from 'ai'
import type { TripMeta } from '../trip/types'
import type { ResultSet } from './results'
import type { OptionSet, PrefForm, ReplySuggestions } from './interactions'

/**
 * Standard parts + custom data parts.
 *
 * Note what is NOT here: the plan itself. Flights, stays and days belong to the client, because the
 * traveler is the only one who puts things in the plan. The server may only report trip *context*
 * it learned during the turn (destination, dates, party, title) via `meta`.
 */
export type TriperUIMessage = UIMessage<
  never,
  {
    meta: TripMeta
    results: ResultSet
    options: OptionSet
    form: PrefForm
    suggestions: ReplySuggestions
  }
>

/** Scan messages newest-first and return the most recent trip context, or null. */
export function getLatestMeta(messages: TriperUIMessage[]): TripMeta | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const parts = messages[i].parts
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j]
      if (part.type === 'data-meta') return part.data
    }
  }
  return null
}
