'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { TripState, Flight, Stay, Place, ItineraryItem } from '@/lib/trip/types'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { ResultSet } from '@/lib/ui/results'
import { getLatestMeta } from '@/lib/ui/messages'
import { allResultSets } from '@/lib/ui/results'
import { buildContextHints } from '@/lib/ui/contextHints'
import { tripToMarkers } from '@/lib/ui/mapMarkers'
import { suggestQuickReplies } from '@/lib/ui/quickReplies'
import { readOpeningContext, contextToMeta, buildOpeningMessage } from '@/lib/ui/openingMessage'
import type { TimelineItem } from '@/lib/trip/timeline'
import {
  createTrip,
  setMeta,
  addFlight,
  addStay,
  addItineraryItem,
  removeFlight,
  removeStay,
  removeItineraryItem,
} from '@/lib/trip/tripState'
import { BookingPanel } from './booking/BookingPanel'
import { ChatPane } from './chat/ChatPane'
import { ChatEmptyState } from './chat/ChatEmptyState'
import { ItineraryView } from './itinerary/ItineraryView'
import { MapView } from './plan/MapView'
import { PlanMapToggle, type PlanView as PlanViewMode } from './plan/PlanMapToggle'
import { PlanOverlay, PlanButton } from './plan/PlanOverlay'
import { ShareButton } from './share/ShareButton'
import { DetailPanel } from './results/DetailPanel'
import { PlannerHeader } from './PlannerHeader'

export function PlannerScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromId = searchParams.get('from')

  const [trip, setTrip] = useState<TripState>(() => {
    const patch = contextToMeta(readOpeningContext(searchParams))
    const t = createTrip('draft')
    return Object.keys(patch).length > 0 ? setMeta(t, patch) : t
  })
  const [view, setView] = useState<PlanViewMode>('plan')
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ kind: ResultSet['kind']; item: Flight | Stay | Place } | null>(null)
  const [booking, setBooking] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const tripRef = useRef(trip)
  tripRef.current = trip
  // Read at send time, not render time: the snapshot must describe the screen they just left.
  const detailRef = useRef(detail)
  detailRef.current = detail

  const addResult = useCallback((set: ResultSet, item: Flight | Stay | Place) => {
    setTrip((t) => {
      if (set.kind === 'stays') return addStay(t, item as Stay)
      if (set.kind === 'flights') return addFlight(t, item as Flight)
      // Carry enough of the place across that the plan row looks like the card they picked.
      const p = item as Place
      const entry: ItineraryItem = {
        placeId: p.id,
        name: p.name,
        coords: p.coords,
        thumbnail: p.photos[0],
        category: p.category,
        rating: p.rating,
        reviewCount: p.reviewCount,
        address: p.address,
        bookUrl: p.sourceLinks?.maps,
      }
      return addItineraryItem(t, 0, entry)
    })
  }, [])

  const openDetail = useCallback((set: ResultSet, item: Flight | Stay | Place) => {
    setDetail({ kind: set.kind, item })
  }, [])

  const removeItem = useCallback((item: TimelineItem) => {
    setTrip((t) => {
      if (item.kind === 'flight') return removeFlight(t, item.id)
      if (item.kind === 'stay') return removeStay(t, item.id)
      return removeItineraryItem(t, item.dayIndex ?? 0, item.id)
    })
  }, [])

  /** Open the full detail for something already in the plan. */
  const viewItem = useCallback((item: TimelineItem) => {
    const current = tripRef.current
    if (item.kind === 'flight') {
      const flight = current.flights.find((f) => f.id === item.id)
      if (flight) setDetail({ kind: 'flights', item: flight })
      return
    }
    if (item.kind === 'stay') {
      const stay = current.stays.find((s) => s.id === item.id)
      if (stay) setDetail({ kind: 'stays', item: stay })
    }
  }, [])

  const { messages, sendMessage, setMessages, status } = useChat<TriperUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          trip: tripRef.current,
          hints: buildContextHints({
            sets: allResultSets(messages as TriperUIMessage[]),
            open: detailRef.current,
          }),
        },
      }),
    }),
  })

  const startNewTrip = useCallback(() => {
    setMessages([])
    setTrip(createTrip('draft'))
    setDetail(null)
    setBooking(false)
    setPlanOpen(false)
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

  // Auto-send one opening message carrying whatever the composer collected.
  const sentInitialRef = useRef(false)
  useEffect(() => {
    if (sentInitialRef.current) return
    const text = buildOpeningMessage(readOpeningContext(searchParams))
    if (!text) return
    sentInitialRef.current = true
    sendMessage({ text })
  }, [searchParams, sendMessage])

  // Fetch a real photo of the destination for the plan hero.
  useEffect(() => {
    const destination = trip.meta.destination
    if (!destination || trip.meta.coverImage) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/destination/photo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ destination }),
        })
        if (!res.ok || cancelled) return
        const { photo } = (await res.json()) as { photo: string | null }
        if (photo && !cancelled) setTrip((t) => setMeta(t, { coverImage: photo }))
      } catch {
        // A missing cover is cosmetic.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [trip.meta.destination, trip.meta.coverImage])

  // Take the context the agent learned (destination, dates, title) but never its idea of the plan:
  // adding and removing is the traveler's alone, so the client stays the source of truth.
  useEffect(() => {
    const meta = getLatestMeta(messages)
    if (meta) setTrip((t) => setMeta(t, meta))
  }, [messages])

  const markers = useMemo(() => tripToMarkers(trip), [trip])
  const quickReplies = useMemo(() => suggestQuickReplies(trip), [trip])
  const planCount = useMemo(
    () =>
      trip.flights.length +
      trip.stays.length +
      trip.days.reduce((sum, day) => sum + day.items.length, 0),
    [trip],
  )

  /*
   * The drawer is addressable: /plan?plan=open deep-links straight to it, and opening or closing it
   * writes that back so the link can be shared. Local state stays the source of truth for the
   * current render, so the drawer never flickers while the router catches up.
   */
  const planParam = searchParams.get('plan')
  useEffect(() => {
    if (planParam === 'open') setPlanOpen(true)
  }, [planParam])

  const writePlanParam = useCallback(
    (open: boolean) => {
      const next = new URLSearchParams(searchParams.toString())
      if (open) next.set('plan', 'open')
      else next.delete('plan')
      const query = next.toString()
      router.replace(query ? `/plan?${query}` : '/plan')
    },
    [router, searchParams],
  )

  const openPlan = useCallback(() => {
    setPlanOpen(true)
    writePlanParam(true)
  }, [writePlanParam])

  const closePlan = useCallback(() => {
    setPlanOpen(false)
    writePlanParam(false)
  }, [writePlanParam])

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
    // The conversation now owns the width. The plan is a drawer you summon, not a permanent column.
    <main className="mx-auto flex min-h-screen max-w-[1100px] flex-col gap-2 p-3 sm:p-4 lg:h-screen lg:overflow-hidden">
      <PlannerHeader
        title={trip.meta.title ?? trip.meta.destination}
        onNewTrip={startNewTrip}
        left={<ShareButton onShare={handleShare} sharing={sharing} shareUrl={shareUrl} />}
        right={<PlanButton itemCount={planCount} onOpen={openPlan} />}
      />

      <div
        data-testid="chat-pane"
        className="glass flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4"
      >
        <ChatPane
          messages={messages}
          status={status}
          suggestions={quickReplies}
          onSend={(text) => sendMessage({ text })}
          onAddResult={addResult}
          onOpenDetail={openDetail}
          tripDates={trip.meta}
          emptyState={<ChatEmptyState onPick={(text) => sendMessage({ text })} />}
        />
      </div>

      <PlanOverlay
        open={planOpen}
        itemCount={planCount}
        title={trip.meta.title ?? (trip.meta.destination ? `${trip.meta.destination} Trip` : undefined)}
        onClose={closePlan}
      >
        <div className="flex h-full min-h-0 flex-col gap-3">
          <PlanMapToggle view={view} onChange={setView} />
          <div className="min-h-0 flex-1">
            {view === 'plan' ? (
              <ItineraryView
                trip={trip}
                onFix={(prompt) => {
                  sendMessage({ text: prompt })
                  closePlan()
                }}
                onRemoveItem={removeItem}
                onViewItem={viewItem}
                onContinueToBook={() => setBooking(true)}
              />
            ) : (
              <MapView markers={markers} />
            )}
          </div>
        </div>
      </PlanOverlay>

      {booking && (
        <BookingPanel
          trip={trip}
          onClose={() => setBooking(false)}
          onStatusChange={(key, status) =>
            setTrip((t) => ({ ...t, bookings: { ...(t.bookings ?? {}), [key]: status } }))
          }
        />
      )}

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
