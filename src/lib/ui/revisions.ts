import type { TriperUIMessage } from './messages'
import { getResultSets, resultSetKey } from './results'

export interface SetRevision {
  /** 1 for the first search of its kind, 2 for the first refinement, and so on. */
  revision: number
  /** True when a later search in the thread answers the same question. */
  superseded: boolean
}

/** Stable identity for one set: which message carried it, and where in that message. */
export function setId(messageId: string, partIndex: number): string {
  return `${messageId}:${partIndex}`
}

/**
 * Place every result set in the thread against the others answering the same question.
 *
 * Without this, six refinements leave six carousels stacked up and the traveler scrolls past four
 * dead ones to reach the live set. Superseded sets collapse instead of being deleted, so a
 * comparison is still there if they want it.
 */
export function revisionsFor(messages: TriperUIMessage[]): Map<string, SetRevision> {
  const flat: { id: string; key: string }[] = []
  for (const message of messages) {
    getResultSets(message).forEach((set, index) => {
      flat.push({ id: setId(message.id, index), key: resultSetKey(set) })
    })
  }

  const totals = new Map<string, number>()
  for (const { key } of flat) totals.set(key, (totals.get(key) ?? 0) + 1)

  const seen = new Map<string, number>()
  const revisions = new Map<string, SetRevision>()
  for (const { id, key } of flat) {
    const nth = (seen.get(key) ?? 0) + 1
    seen.set(key, nth)
    revisions.set(id, { revision: nth, superseded: nth < (totals.get(key) ?? 1) })
  }
  return revisions
}
