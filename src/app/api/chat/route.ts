import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { createPlannerAgent } from '@/lib/ai/plannerAgent'
import type { TripState } from '@/lib/trip/types'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, trip }: { messages: UIMessage[]; trip?: TripState } = await req.json()

  const { agent } = createPlannerAgent({ trip })
  const result = await agent.stream({ messages: await convertToModelMessages(messages) })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
