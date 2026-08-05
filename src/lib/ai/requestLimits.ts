import type { ContextHint } from '../ui/contextHints'

/**
 * What one request is allowed to put in front of the model.
 *
 * Nothing here needs an account, and the rate limiter bounds how *often* somebody can ask — but not
 * how *much* they can ask with. Every character of conversation and every character of screen
 * context is billed as input tokens on each turn, so an unbounded body is an unbounded bill: one
 * scripted request carrying a few megabytes of text costs more than a hundred real planning turns.
 *
 * The client caps all of this already. These are the server's own limits, because the client is the
 * one thing we cannot trust to have applied them.
 *
 * Every ceiling sits far above a genuine session. A thorough trip runs perhaps sixty turns of short
 * prose, which is a few tens of thousands of characters all in.
 */

/** Turns in one thread. A long planning session is dozens, not hundreds. */
export const MAX_MESSAGES = 200

/**
 * Characters of conversation, counting only what actually reaches the model.
 *
 * Data parts are excluded on purpose: `convertToModelMessages` drops them unless it is given a
 * converter, and we give it none, so the result cards echoed back with each turn cost nothing. This
 * counts the text, which is the part that bills.
 */
export const MAX_PROMPT_CHARS = 100_000

/** Hints in one request. The client sends at most four: the visible sets, the open panel, the plan. */
export const MAX_HINTS = 8

const MAX_DESCRIPTION_CHARS = 500

/** Matches the client's own per-hint ceiling, with room to spare. */
const MAX_HINT_CONTENT_CHARS = 6_000

/** The hint kinds the system prompt knows how to introduce. Anything else is not ours. */
const HINT_TYPES = new Set<ContextHint['hintType']>([
  'flight_results',
  'stay_results',
  'place_results',
  'flight_detail',
  'stay_detail',
  'place_detail',
  'plan',
])

function isHintType(value: unknown): value is ContextHint['hintType'] {
  return typeof value === 'string' && HINT_TYPES.has(value as ContextHint['hintType'])
}

function parts(message: unknown): unknown[] {
  if (typeof message !== 'object' || message === null) return []
  const { parts: list } = message as { parts?: unknown }
  return Array.isArray(list) ? list : []
}

function partType(part: unknown): string | undefined {
  if (typeof part !== 'object' || part === null) return undefined
  const { type } = part as { type?: unknown }
  return typeof type === 'string' ? type : undefined
}

/** How much text this thread will put in the prompt. */
export function promptChars(messages: unknown[]): number {
  let total = 0
  for (const message of messages) {
    for (const part of parts(message)) {
      if (partType(part) !== 'text') continue
      const { text } = part as { text?: unknown }
      if (typeof text === 'string') total += text.length
    }
  }
  return total
}

/**
 * A part this app never sends and will not forward.
 *
 * A file part carries a url the *provider* then fetches, so accepting one would let a crafted
 * request spend our tokens reading something of its choosing. The composer only ever produces text.
 */
export function hasUnsupportedPart(messages: unknown[]): boolean {
  return messages.some((message) => parts(message).some((part) => partType(part) === 'file'))
}

/** Why a thread was refused, in words safe to hand back. */
export type ThreadProblem = 'too_many_messages' | 'too_much_text' | 'unsupported_part'

/** Null when the thread is fine to run. */
export function threadProblem(messages: unknown[]): ThreadProblem | null {
  if (messages.length > MAX_MESSAGES) return 'too_many_messages'
  if (hasUnsupportedPart(messages)) return 'unsupported_part'
  if (promptChars(messages) > MAX_PROMPT_CHARS) return 'too_much_text'
  return null
}

function clip(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.slice(0, limit) : ''
}

/**
 * The screen context, reduced to the shape the system prompt expects.
 *
 * Hints are interpolated straight into the instructions, so this is the boundary where client text
 * stops being arbitrary: an unknown kind is dropped, and every field is clipped. Dropping a hint is
 * safe — the agent simply asks what it would otherwise have inferred — which is why this trims
 * rather than refusing the whole turn.
 */
export function sanitizeHints(value: unknown): ContextHint[] {
  if (!Array.isArray(value)) return []
  const hints: ContextHint[] = []
  for (const raw of value.slice(0, MAX_HINTS)) {
    if (typeof raw !== 'object' || raw === null) continue
    const { hintType, description, content, capturedAt } = raw as Record<string, unknown>
    if (!isHintType(hintType)) continue
    const clipped = clip(content, MAX_HINT_CONTENT_CHARS)
    if (clipped.length === 0) continue
    hints.push({
      hintType,
      description: clip(description, MAX_DESCRIPTION_CHARS),
      content: clipped,
      capturedAt: clip(capturedAt, 40),
    })
  }
  return hints
}
