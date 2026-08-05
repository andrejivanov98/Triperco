import { parseChatText } from '../ui/chatText'

/**
 * Whether a finished turn is worth showing, and what to say when it is not.
 *
 * A planning turn can fail in a way no error handler catches: the model answers with a code block,
 * a raw payload, or nothing at all. The stream succeeded, so nothing threw — but the traveler is
 * looking at an empty bubble. That is the failure this module names.
 */

/**
 * The prose a traveler would actually read, with code, payloads and markdown already removed.
 *
 * Deliberately the same parser the chat renders through, so this can never disagree with what is
 * on screen: if `usableProse` is empty, the message bubble is empty too.
 */
export function usableProse(text: string): string {
  return parseChatText(text)
    .flatMap((block) =>
      block.type === 'bullets'
        ? (block.items ?? []).map((item) => item.map((s) => s.text).join(''))
        : [block.spans.map((s) => s.text).join('')],
    )
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
}

export interface TurnOutput {
  /** The assistant text as the model wrote it, before parsing. */
  text: string
  /** How many cards, option menus and forms this turn put on screen. */
  rendered: number
}

/**
 * A turn nobody can act on: no readable sentence, and nothing rendered beside it.
 *
 * Cards alone are a complete answer — plenty of good turns are wordless — so a turn only counts as
 * unusable when the traveler is left with literally nothing.
 */
export function isUnusableTurn(turn: TurnOutput): boolean {
  if (turn.rendered > 0) return false
  return usableProse(turn.text).length === 0
}

/** Appended to the repair attempt, naming the specific thing that went wrong. */
export const REPAIR_INSTRUCTION =
  'Your previous reply contained no readable text for the traveler. Answer again in one short ' +
  'sentence of plain conversation. No code, no JSON, no markup, no tool call — just the sentence.'

/**
 * Shown only when a turn and its repair both came back empty. Never an error code, never a stack,
 * never the name of a provider — none of that is the traveler's problem to read.
 */
export const RECOVERY_TEXT = "That didn't come through properly. Want me to try again?"

/** So a failed turn still ends with somewhere to go. */
export const RECOVERY_REPLIES = ['Try that again', 'Show me something else']
