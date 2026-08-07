import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai'
import { createPlannerAgent } from '@/lib/ai/plannerAgent'
import { planStage } from '@/lib/trip/stage'
import { repairReply } from '@/lib/ai/repair'
import { contractBreach, usableProse, RECOVERY_REPLIES, RECOVERY_TEXT } from '@/lib/ai/turnQuality'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { TripState } from '@/lib/trip/types'
import type { ContextHint } from '@/lib/ui/contextHints'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'
import { threadProblem, sanitizeHints } from '@/lib/ai/requestLimits'

/**
 * A planning turn can chain several provider searches, and a long-haul round trip fans out to
 * fetch return legs. Thirty seconds was aborting those mid-flight and showing the traveler nothing.
 */
export const maxDuration = 60

/**
 * What the traveler reads when the turn itself threw. Deliberately fixed text: a provider message
 * can name an engine, a quota or a key, and none of that belongs on a traveler's screen.
 */
const STREAM_FAILED = 'Something went wrong on my side — try that again?'

export async function POST(req: Request) {
  const limit = await checkRateLimit(req, 'chat')
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  let body: { messages?: unknown; trip?: TripState; hints?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Malformed request body.' }, { status: 400 })
  }
  // A missing or misshapen thread would throw deep inside the SDK; say so plainly instead.
  if (!Array.isArray(body.messages)) {
    return Response.json({ error: 'messages must be an array.' }, { status: 400 })
  }
  /*
   * The rate limiter bounds how often somebody can ask; this bounds how much they can ask with.
   * Every character here is billed as input on every turn, so an unbounded thread is an unbounded
   * bill — and the client's own caps are the one thing a crafted request simply omits.
   */
  const problem = threadProblem(body.messages)
  if (problem === 'unsupported_part') {
    return Response.json({ error: 'That message carries something I cannot read.' }, { status: 400 })
  }
  if (problem) {
    return Response.json(
      { error: 'That conversation is too large to continue. Start a new chat.', reason: problem },
      { status: 413 },
    )
  }
  const messages = body.messages as TriperUIMessage[]

  /*
   * The client sends what was on screen, so the agent can resolve "the second one" without asking.
   * Sanitized rather than trusted: hints are interpolated straight into the system prompt, and one
   * of them describes a trip that may have arrived from somebody else's shared link.
   */
  const hints: ContextHint[] = sanitizeHints(body.hints)
  // The stage this turn was *given* lives inside the agent's instructions. What the contract below
  // judges is the stage the plan is on once the turn is over, which the turn itself can have moved.
  const { agent, state } = createPlannerAgent({ trip: body.trip, hints })

  const stream = createUIMessageStream<TriperUIMessage>({
    // A thrown turn becomes one calm sentence — never a stack, never the provider's own words.
    onError: () => STREAM_FAILED,
    execute: async ({ writer }) => {
      const modelMessages = await convertToModelMessages(messages)

      /*
       * Awaiting `result.text` here rather than reading it in `onFinish`: this callback is awaited
       * before the stream closes, so it is the one place we can judge what the turn produced and
       * still write to the stream afterwards.
       */
      let text = ''
      /*
       * Whether the first attempt got as far as producing a stream. It decides whether a second one
       * is safe, and the distinction is not academic: `agent.stream()` resolves as soon as the
       * request is accepted, so a turn that dies part-way through dies by rejecting `result.text` —
       * after its stream was merged and after its tools already ran. Retrying at that point would
       * bill every search a second time, append a second reply to the same bubble, and leave two
       * copies of every result set in the state written below.
       */
      let started = false
      try {
        const result = await agent.stream({ messages: modelMessages })
        started = true
        writer.merge(toUIMessageStream({ stream: result.stream }))
        text = await result.text
      } catch {
        /*
         * The turn never got going: nothing reached the traveler and no tool ran, so one retry costs
         * only time. The usual causes — a transient provider error, a rate limit at the model —
         * clear within a second.
         *
         * A turn that died mid-stream is not retried. It falls through to the empty-turn handling
         * below, whose repair is deliberately toolless: the traveler still gets a sentence, and the
         * searches that already ran are not paid for twice.
         */
        if (!started) {
          try {
            const retry = await agent.stream({ messages: modelMessages })
            writer.merge(toUIMessageStream({ stream: retry.stream }))
            text = await retry.text
          } catch {
            text = ''
          }
        } else {
          text = ''
        }
      }

      // Only the context the agent learned — never the plan. The traveler owns the plan.
      writer.write({ type: 'data-meta', data: state.trip.meta })
      // Emit each search performed this turn so the client can show result carousels.
      for (const set of state.pendingResults) {
        writer.write({ type: 'data-results', data: set })
      }
      for (const o of state.pendingOptions) {
        writer.write({ type: 'data-options', data: o })
      }
      for (const f of state.pendingForms) {
        writer.write({ type: 'data-form', data: f })
      }
      for (const d of state.pendingDetails) {
        writer.write({ type: 'data-detail', data: d })
      }
      for (const s of state.pendingSuggestions) {
        writer.write({ type: 'data-suggestions', data: s })
      }

      const rendered =
        state.pendingResults.length +
        state.pendingOptions.length +
        state.pendingForms.length +
        state.pendingDetails.length

      /*
       * The contract is judged against the step the plan is on *now*, not the one it was on when the
       * turn started. The turn itself can move it, and judging the old one gets both halves wrong.
       *
       * A turn asked for the destination that recorded it and stopped would have been handed the
       * destination card back — a question about something the trip already knows. And a turn asked
       * how they get around, that answered it, renders no cards at all: `getTransferOptions` puts
       * nothing on screen, so every successful one of those looked like a stall and collected an
       * "I could not get the transfer times" underneath the real answer. Recomputing fixes both,
       * because the tool that did the work is the same tool that moved the step on.
       */
      const settled = planStage(state.trip)
      const breach = contractBreach({ text, rendered }, settled)
      if (!breach) return

      /*
       * The brief was supposed to be taken with a control and was not: the model asked in prose, or
       * asked nothing. Write the stage's own card — a calendar, the steppers, the trip-type options —
       * and no second model call. This is what makes the intake a guarantee rather than a hope, and
       * it is why the traveler can never be asked to type a date range into a chat box.
       *
       * The model's sentence is kept when it wrote one: it is usually a perfectly good lead-in to the
       * card. Only a silent turn gets Triperco's own words instead.
       */
      if (breach === 'unasked' && settled.asks) {
        const ask = settled.asks
        if (usableProse(text).length === 0) {
          writer.write({ type: 'data-notice', data: { text: settled.nudge, kind: 'recovered' } })
        }
        if (ask.kind === 'detail') {
          writer.write({ type: 'data-detail', data: { field: ask.field, question: ask.question } })
        } else {
          writer.write({
            type: 'data-form',
            data: {
              question: ask.question,
              mode: ask.mode,
              options: ask.options,
              intent: ask.intent,
            },
          })
        }
        return
      }

      /*
       * The turn promised this stage's work and delivered none of it — the "I'll look into flights"
       * with no flights behind it. Answered in Triperco's own voice from the stage, and deliberately
       * without a second model call: the searches this turn already ran would be billed twice, and
       * the model has just demonstrated it is not going to run the one that mattered. The stage
       * replies go out beside it so there is always a tap that gets the search moving.
       */
      if (breach === 'stalled') {
        writer.write({ type: 'data-notice', data: { text: settled.nudge, kind: 'failed' } })
        writer.write({ type: 'data-suggestions', data: { replies: [...settled.replies] } })
        return
      }

      /*
       * Nothing threw, yet the traveler is looking at an empty bubble: the model answered with a
       * code block, a payload, or nothing at all. Ask once more for plain conversation. Only if that
       * also comes back empty do we say so in our own voice — the chat never dead-ends.
       */
      const repaired = await repairReply(modelMessages)
      writer.write({
        type: 'data-notice',
        data: repaired
          ? { text: repaired, kind: 'recovered' }
          : { text: RECOVERY_TEXT, kind: 'failed' },
      })
      if (!repaired) {
        writer.write({ type: 'data-suggestions', data: { replies: [...RECOVERY_REPLIES] } })
      }
    },
  })

  return createUIMessageStreamResponse({ stream })
}
