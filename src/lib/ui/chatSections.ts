import type { TriperUIMessage } from './messages'
import { getResultSets, resultSetKey } from './results'
import { setId } from './revisions'

export interface ChatSection {
  /** The element id to scroll to. */
  id: string
  /** What the traveler would call this part of the conversation. */
  label: string
}

/** Title Case for a query the agent wrote, without shouting. */
function tidy(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function labelFor(
  set: ReturnType<typeof getResultSets>[number],
  destination: string | undefined,
): string {
  const where = set.query?.trim() || destination || ''
  if (set.kind === 'flights') {
    const noun =
      set.flightType === 'return'
        ? 'Flights home'
        : set.flightType === 'round_trip'
          ? 'Round trips'
          : 'Flights'
    return where ? `${noun} · ${tidy(where)}` : noun
  }
  if (set.kind === 'stays') return where ? `Stays in ${tidy(where)}` : 'Places to stay'
  const kind = set.placeKind
  const noun = kind === 'tour' ? 'Tours' : kind === 'event' ? 'Events' : 'Things to do'
  return where ? `${noun} · ${tidy(where)}` : noun
}

/**
 * Every set of results in the thread, as a place you can jump back to.
 *
 * A long conversation buries the flights under the stays under the restaurants. This is the table of
 * contents for it — one entry per search, newest last, with the superseded ones left out because
 * they have already collapsed on screen.
 */
export function chatSections(
  messages: TriperUIMessage[],
  destination?: string,
): ChatSection[] {
  const seen = new Map<string, ChatSection>()
  for (const message of messages) {
    getResultSets(message).forEach((set, index) => {
      // Keyed by question, so a refined search replaces its own entry instead of adding one.
      seen.set(resultSetKey(set), {
        id: setId(message.id, index),
        label: labelFor(set, destination),
      })
    })
  }
  return [...seen.values()]
}
