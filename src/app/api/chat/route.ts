import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai'
import { createPlannerAgent } from '@/lib/ai/plannerAgent'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { TripState } from '@/lib/trip/types'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, trip }: { messages: TriperUIMessage[]; trip?: TripState } =
    await req.json()

  const { agent, state } = createPlannerAgent({ trip })

  const stream = createUIMessageStream<TriperUIMessage>({
    execute: async ({ writer }) => {
      const result = await agent.stream({
        messages: await convertToModelMessages(messages),
        onFinish: () => {
          // Emit the trip the tools built this turn so the client can render it.
          writer.write({ type: 'data-trip', data: state.trip })
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
        },
      })
      writer.merge(toUIMessageStream({ stream: result.stream }))
    },
  })

  return createUIMessageStreamResponse({ stream })
}
