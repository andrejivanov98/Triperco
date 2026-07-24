'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { TripState, Flight, Stay, Place, ItineraryItem } from '@/lib/trip/types'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { ResultSet } from '@/lib/ui/results'
import { getLatestTrip } from '@/lib/ui/messages'
import { tripToMarkers } from '@/lib/ui/mapMarkers'
import { createTrip, addFlight, addStay, addItineraryItem } from '@/lib/trip/tripState'
import { ChatPane } from './chat/ChatPane'
import { ItineraryView } from './itinerary/ItineraryView'
import { MapView } from './plan/MapView'
import { PlanMapToggle, type PlanView as PlanViewMode } from './plan/PlanMapToggle'
import { ShareButton } from './share/ShareButton'
import { DetailView } from './results/DetailView'

const SUGGESTIONS = ['Plan a weekend in Rome', 'Find me a cheap flight', 'Add a hidden gem']

export function PlannerScreen() {
  const searchParams = useSearchParams()
  const fromId = searchParams.get('from')
  const initialQuery = searchParams.get('q')

  const [trip, setTrip] = useState<TripState>(() => createTrip('draft'))
  const [view, setView] = useState<PlanViewMode>('plan')
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ kind: ResultSet['kind']; item: Flight | Stay | Place } | null>(null)
  const tripRef = useRef(trip)
  tripRef.current = trip

  const addResult = useCallback((set: ResultSet, item: Flight | Stay | Place) => {
    setTrip((t) => {
      if (set.kind === 'stays') return addStay(t, item as Stay)
      if (set.kind === 'flights') return addFlight(t, item as Flight)
      const p = item as Place
      const entry: ItineraryItem = { placeId: p.id, name: p.name, coords: p.coords }
      return addItineraryItem(t, 0, entry)
    })
  }, [])

  const openDetail = useCallback((set: ResultSet, item: Flight | Stay | Place) => {
    setDetail({ kind: set.kind, item })
    setView('plan')
  }, [])

  const { messages, sendMessage, status } = useChat<TriperUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, trip: tripRef.current },
      }),
    }),
  })

  // Seed from a shared trip when arriving via /plan?from={id}.
  useEffect(() => {
    if (!fromId) return
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/trips/${fromId}`)
      if (!res.ok || cancelled) return
      setTrip((await res.json()) as TripState)
    })()
    return () => {
      cancelled = true
    }
  }, [fromId])

  // Auto-send the landing prompt once when arriving via /plan?q={prompt}.
  const sentInitialRef = useRef(false)
  useEffect(() => {
    if (!initialQuery || sentInitialRef.current) return
    sentInitialRef.current = true
    sendMessage({ text: initialQuery })
  }, [initialQuery, sendMessage])

  useEffect(() => {
    const latest = getLatestTrip(messages)
    if (latest) setTrip(latest)
  }, [messages])

  const markers = useMemo(() => tripToMarkers(trip), [trip])

  const handleShare = useCallback(async () => {
    setSharing(true)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trip: tripRef.current }),
      })
      const { id } = (await res.json()) as { id: string }
      setShareUrl(`${window.location.origin}/trip/${id}`)
    } finally {
      setSharing(false)
    }
  }, [])

  return (
    <main className="mx-auto grid h-screen max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(320px,36%)_1fr]">
      <ChatPane
        messages={messages}
        status={status}
        suggestions={messages.length === 0 ? SUGGESTIONS : []}
        onSend={(text) => sendMessage({ text })}
        onAddResult={addResult}
        onOpenDetail={openDetail}
      />

      <div className="glass flex min-h-0 flex-col gap-3 p-4">
        {detail ? (
          <DetailView
            kind={detail.kind}
            item={detail.item}
            onClose={() => setDetail(null)}
            onAdd={() => {
              addResult({ kind: detail.kind, items: [] } as ResultSet, detail.item)
              setDetail(null)
            }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <PlanMapToggle view={view} onChange={setView} />
              <ShareButton onShare={handleShare} sharing={sharing} shareUrl={shareUrl} />
            </div>
            <div className="min-h-0 flex-1">
              {view === 'plan' ? <ItineraryView trip={trip} /> : <MapView markers={markers} />}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
