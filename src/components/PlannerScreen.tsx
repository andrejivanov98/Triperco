'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { TripState, Flight, Stay, Place, ItineraryItem } from '@/lib/trip/types'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { ResultSet } from '@/lib/ui/results'
import { getLatestTrip } from '@/lib/ui/messages'
import { tripToMarkers } from '@/lib/ui/mapMarkers'
import { suggestQuickReplies } from '@/lib/ui/quickReplies'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from '@/lib/trip/tripState'
import { ChatPane } from './chat/ChatPane'
import { ChatEmptyState } from './chat/ChatEmptyState'
import { ItineraryView } from './itinerary/ItineraryView'
import { MapView } from './plan/MapView'
import { PlanMapToggle, type PlanView as PlanViewMode } from './plan/PlanMapToggle'
import { ShareButton } from './share/ShareButton'
import { DetailPanel } from './results/DetailPanel'
import { PlannerHeader } from './PlannerHeader'

export function PlannerScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromId = searchParams.get('from')

  const [trip, setTrip] = useState<TripState>(() => {
    let t = createTrip('draft')
    const dest = searchParams.get('dest') ?? undefined
    const start = searchParams.get('start') ?? undefined
    const end = searchParams.get('end') ?? undefined
    const travelersRaw = searchParams.get('travelers')
    const travelers = travelersRaw ? Number(travelersRaw) : undefined
    if (dest || start || end || (travelers && travelers > 0)) {
      t = setMeta(t, {
        destination: dest,
        startDate: start,
        endDate: end,
        ...(travelers && travelers > 0 ? { travelers } : {}),
      })
    }
    return t
  })
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
  }, [])

  const editMeta = useCallback((patch: Partial<TripState['meta']>) => {
    setTrip((t) => setMeta(t, patch))
  }, [])

  const { messages, sendMessage, setMessages, status } = useChat<TriperUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, trip: tripRef.current },
      }),
    }),
  })

  const startNewTrip = useCallback(() => {
    setMessages([])
    setTrip(createTrip('draft'))
    setDetail(null)
    setShareUrl(null)
    setView('plan')
    router.replace('/plan')
  }, [router, setMessages])

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

  // Auto-send one opening message: the free-text q, or a composed prompt from structured context.
  const sentInitialRef = useRef(false)
  useEffect(() => {
    if (sentInitialRef.current) return
    const q = searchParams.get('q')
    const dest = searchParams.get('dest')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const travelers = searchParams.get('travelers')

    let text: string | null = null
    if (q) {
      text = q
    } else if (dest || start || end || travelers) {
      const parts = [`Plan my trip to ${dest || 'somewhere great'}`]
      if (start && end) parts.push(`from ${start} to ${end}`)
      if (travelers) parts.push(`for ${travelers} travelers`)
      text = parts.join(' ') + '.'
    }
    if (!text) return
    sentInitialRef.current = true
    sendMessage({ text })
  }, [searchParams, sendMessage])

  useEffect(() => {
    const latest = getLatestTrip(messages)
    if (latest) setTrip(latest)
  }, [messages])

  const markers = useMemo(() => tripToMarkers(trip), [trip])
  const quickReplies = useMemo(() => suggestQuickReplies(trip), [trip])

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
    // Locked viewport height on desktop; on narrow screens the panes stack and the page scrolls.
    <main className="mx-auto flex min-h-screen max-w-[1700px] flex-col gap-2 p-3 sm:p-4 lg:h-screen lg:overflow-hidden">
      <PlannerHeader
        title={trip.meta.title ?? trip.meta.destination}
        onNewTrip={startNewTrip}
        right={<ShareButton onShare={handleShare} sharing={sharing} shareUrl={shareUrl} />}
      />

      {/*
        A fixed 70/30 split: 7fr/3fr can't be renegotiated by content, and min-w-0 on each pane
        stops a wide card row from stretching its column (grid children default to min-width:auto).
      */}
      <div
        data-testid="planner-grid"
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[7fr_3fr]"
      >
        <div
          data-testid="chat-pane"
          className="glass flex min-h-[60vh] min-w-0 flex-col overflow-hidden p-4 lg:min-h-0"
        >
          <ChatPane
            messages={messages}
            status={status}
            suggestions={quickReplies}
            onSend={(text) => sendMessage({ text })}
            onAddResult={addResult}
            onOpenDetail={openDetail}
            emptyState={<ChatEmptyState onPick={(text) => sendMessage({ text })} />}
          />
        </div>

        <aside
          data-testid="plan-pane"
          className="glass flex min-h-[50vh] min-w-0 flex-col gap-3 overflow-hidden p-3 lg:min-h-0"
        >
          <div className="flex items-center justify-between gap-2">
            <PlanMapToggle view={view} onChange={setView} />
          </div>
          <div className="min-h-0 flex-1">
            {view === 'plan' ? (
              <ItineraryView
                trip={trip}
                onFix={(prompt) => sendMessage({ text: prompt })}
                onEditMeta={editMeta}
              />
            ) : (
              <MapView markers={markers} />
            )}
          </div>
        </aside>
      </div>

      {detail && (
        <DetailPanel
          kind={detail.kind}
          item={detail.item}
          meta={trip.meta}
          onClose={() => setDetail(null)}
          onAdd={() => {
            addResult({ kind: detail.kind, items: [] } as ResultSet, detail.item)
            setDetail(null)
          }}
        />
      )}
    </main>
  )
}
