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

/** What a stage needs from a turn: whether it must deliver options, and whether it must ask. */
export interface TurnContract {
  delivers: boolean
  /** Present when the stage exists to put a specific control on screen. */
  asks?: unknown
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

/**
 * How a finished turn failed the traveler, if it did.
 *
 * `unasked` — a stage whose job was to put a control on screen, that put nothing on screen.
 * `empty`   — nothing readable and nothing rendered. The bubble is blank.
 * `stalled` — a turn whose whole job was to put options on screen, that put nothing on screen.
 *
 * All three are judged structurally, never by reading the prose. The turn that prompted `stalled`
 * said "Alright, I'll look into flights from Skopje to Tenerife for those dates for two adults" and
 * then searched nothing — but matching on phrases like that is a losing game, because the next
 * version of the same failure is worded differently. What does not vary is the outcome: a stage that
 * rendered zero cards has failed, whatever it claimed to be doing.
 *
 * `unasked` is checked before `empty`, and the order is the whole point. A turn that asked for the
 * dates in prose, or said nothing at all, is repaired by *sending the calendar* — not by asking the
 * model for another sentence, which is what produced the prose question in the first place.
 */
export function contractBreach(
  turn: TurnOutput,
  stage: TurnContract,
): 'unasked' | 'empty' | 'stalled' | null {
  if (stage.asks && turn.rendered === 0) return 'unasked'
  if (isUnusableTurn(turn)) return 'empty'
  if (stage.delivers && turn.rendered === 0) return 'stalled'
  return null
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
