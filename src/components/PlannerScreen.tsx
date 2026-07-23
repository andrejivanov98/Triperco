'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { TripState } from '@/lib/trip/types'
import type { TriperUIMessage } from '@/lib/ui/messages'
import { getLatestTrip } from '@/lib/ui/messages'
import { createTrip } from '@/lib/trip/tripState'
import { ChatPane } from './chat/ChatPane'
import { PlanView } from './plan/PlanView'

const SUGGESTIONS = ['Plan a weekend in Rome', 'Find me a cheap flight', 'Add a hidden gem']

export function PlannerScreen() {
  const [trip, setTrip] = useState<TripState>(() => createTrip('draft'))
  const tripRef = useRef(trip)
  tripRef.current = trip

  const { messages, sendMessage, status } = useChat<TriperUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      // Send the current trip up with every turn so the agent continues from it.
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, trip: tripRef.current },
      }),
    }),
  })

  // Pull the latest server-built trip into the right pane.
  useEffect(() => {
    const latest = getLatestTrip(messages)
    if (latest) setTrip(latest)
  }, [messages])

  return (
    <main className="mx-auto grid h-screen max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(320px,36%)_1fr]">
      <ChatPane
        messages={messages}
        status={status}
        suggestions={messages.length === 0 ? SUGGESTIONS : []}
        onSend={(text) => sendMessage({ text })}
      />
      <div className="glass min-h-0 p-4">
        <PlanView trip={trip} />
      </div>
    </main>
  )
}
