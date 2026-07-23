import type { UIMessage } from 'ai'
import type { TripState } from '../trip/types'

/** Our chat message type: standard parts + a custom `data-trip` part carrying TripState. */
export type TriperUIMessage = UIMessage<never, { trip: TripState }>

/** Scan messages newest-first and return the most recent TripState, or null. */
export function getLatestTrip(messages: TriperUIMessage[]): TripState | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const parts = messages[i].parts
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j]
      if (part.type === 'data-trip') return part.data
    }
  }
  return null
}
