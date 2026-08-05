import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai'
import { createPlannerAgent } from '@/lib/ai/plannerAgent'
import { repairReply } from '@/lib/ai/repair'
import { isUnusableTurn, RECOVERY_REPLIES, RECOVERY_TEXT } from '@/lib/ai/turnQuality'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { TripState } from '@/lib/trip/types'
import type { ContextHint } from '@/lib/ui/contextHints'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'

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

  let body: { messages?: unknown; trip?: TripState; hints?: ContextHint[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Malformed request body.' }, { status: 400 })
  }
  // A missing or misshapen thread would throw deep inside the SDK; say so plainly instead.
  if (!Array.isArray(body.messages)) {
    return Response.json({ error: 'messages must be an array.' }, { status: 400 })
  }
  const messages = body.messages as TriperUIMessage[]

  // The client sends what was on screen, so the agent can resolve "the second one" without asking.
  const { agent, state } = createPlannerAgent({ trip: body.trip, hints: body.hints })

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
      try {
        const result = await agent.stream({ messages: modelMessages })
        writer.merge(toUIMessageStream({ stream: result.stream }))
        text = await result.text
      } catch {
        /*
         * The turn never got going. One retry, because the usual causes — a transient provider
         * error, a rate limit at the model — clear within a second. A second failure falls through
         * to the empty-turn handling below, which always leaves something on screen.
         */
        try {
          const retry = await agent.stream({ messages: modelMessages })
          writer.merge(toUIMessageStream({ stream: retry.stream }))
          text = await retry.text
        } catch {
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
      if (!isUnusableTurn({ text, rendered })) return

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
