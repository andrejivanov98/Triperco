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
import { plannedIds } from '@/lib/trip/planned'
import { suggestQuickReplies } from '@/lib/ui/quickReplies'
import { planStageName, stageAdvancePrompt, type PlanStage } from '@/lib/trip/stage'
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
import { SiteHeader } from './SiteHeader'
import { SectionNavigator } from './chat/SectionNavigator'
import { chatSections } from '@/lib/ui/chatSections'

/**
 * How long to wait after the plan moves on before the concierge picks the conversation back up.
 *
 * Long enough that adding an outbound and a return, or two things to do in a row, is one moment
 * rather than two interruptions; short enough that it still reads as a reply to what they just did.
 */
const ADVANCE_DELAY_MS = 1500

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
  const [booking, setBooking] = useState<false | 'partners' | 'summary'>(false)
  const [planOpen, setPlanOpen] = useState(false)
  const tripRef = useRef(trip)
  tripRef.current = trip
  /*
   * The address this trip has already been shared at, and the token that permits updating it.
   *
   * Deliberately not on the trip itself: a trip opened from someone else's link would then carry
   * their id, and editing it would overwrite their shared plan. This is per-session, so a copied
   * trip can only ever get a link of its own.
   */
  const shareRef = useRef<{ id?: string; token?: string }>({})
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
            trip: tripRef.current,
          }),
        },
      }),
    }),
  })

  /** Matches ChatPane's own reading, so nothing is sent into a turn that is still running. */
  const busy = status !== 'ready' && status !== 'error'

  const stage = useMemo(() => planStageName(trip), [trip])
  /** Stages already picked up, so an advance prompts exactly once per session. */
  const nudgedRef = useRef<Set<PlanStage>>(new Set())

  const startNewTrip = useCallback(() => {
    setMessages([])
    nudgedRef.current = new Set()
    setTrip(createTrip('draft'))
    setDetail(null)
    setBooking(false)
    setPlanOpen(false)
    setShareUrl(null)
    // A new trip is a new thing to share; reusing the last link would overwrite the old plan.
    shareRef.current = {}
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
      /*
       * This copy gets its own link. Someone else's trip arrives with their id, and adopting it would
       * mean editing a copy silently rewrote the plan they shared with everybody.
       */
      shareRef.current = {}
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

  /*
   * Pick the conversation back up when the plan moves on by itself.
   *
   * Adding a card is a decision, and until now the agent never heard about it: the plan hint is
   * built when a message is sent, so choosing a flight and then waiting told the agent nothing and
   * the traveler got silence. That is the whole reason "flights are in — shall we find you a bed?"
   * could not happen. Now the stage advancing is itself the trigger.
   *
   * The prompt goes in as a visible message rather than a hidden one, because they really did just
   * do the thing it describes, and a transcript with invisible turns in it is a transcript nobody
   * can follow. Once per stage per session, never while a turn is already in flight, and never
   * before the conversation has started — a plan opened from somebody else's link should sit still.
   */
  useEffect(() => {
    if (messages.length === 0) {
      // Whatever stage an arriving plan is already on is not news; only later moves are.
      nudgedRef.current.add(stage)
      return
    }
    if (busy || nudgedRef.current.has(stage)) return
    const prompt = stageAdvancePrompt(stage)
    if (!prompt) return

    const timer = setTimeout(() => {
      nudgedRef.current.add(stage)
      sendMessage({ text: prompt })
    }, ADVANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [stage, busy, messages.length, sendMessage])

  const markers = useMemo(() => tripToMarkers(trip), [trip])
  // Recomputed on every plan change, so a card flips to "Added" the moment it lands.
  const planned = useMemo(() => plannedIds(trip), [trip])
  const sections = useMemo(
    () => chatSections(messages, trip.meta.destination),
    [messages, trip.meta.destination],
  )
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

  /**
   * Save the trip and return the link to it. Null when it could not be saved, so a caller can say so
   * rather than handing someone a link to an empty planner.
   *
   * One trip keeps one link. The id and the write token from the first save are held here and sent
   * back on every later one, so the same address is updated in place: a link already sent to somebody
   * keeps working and shows what the plan looks like now. Sharing from the header and from the trip
   * summary therefore hand out the same url rather than two divergent snapshots.
   */
  const createShareLink = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trip: tripRef.current, ...shareRef.current }),
      })
      if (!res.ok) return null
      const { id, token } = (await res.json()) as { id?: string; token?: string }
      if (!id) return null
      // The server may have minted a new pair (first save, or an expired trip); keep whatever it says.
      shareRef.current = token ? { id, token } : { id }
      return `${window.location.origin}/trip/${id}`
    } catch {
      return null
    }
  }, [])

  const handleShare = useCallback(async () => {
    setSharing(true)
    try {
      setShareUrl(await createShareLink())
    } finally {
      setSharing(false)
    }
  }, [createShareLink])

  return (
    // The conversation now owns the width. The plan is a drawer you summon, not a permanent column.
    <main className="flex h-[100dvh] flex-col overflow-hidden">
      <SiteHeader
        onNewChat={startNewTrip}
        center={
          <SectionNavigator
            sections={sections}
            onJump={(id) =>
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          />
        }
        right={
          <>
            <PlanButton itemCount={planCount} onOpen={openPlan} />
            <ShareButton onShare={handleShare} sharing={sharing} shareUrl={shareUrl} />
          </>
        }
      />

      <div className="mx-auto flex w-full min-h-0 max-w-[1400px] flex-1 flex-col gap-2 px-2 py-2 sm:px-4">
      <div
        data-testid="chat-pane"
        className="glass flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4"
      >
        <ChatPane
          messages={messages}
          status={status}
          suggestions={quickReplies}
          onSend={(text) => sendMessage({ text })}
          onAddResult={addResult}
          onOpenDetail={openDetail}
          tripDates={trip.meta}
          plannedIds={planned}
          emptyState={<ChatEmptyState onPick={(text) => sendMessage({ text })} />}
        />
      </div>
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
                onContinueToBook={() => setBooking('partners')}
                onViewSummary={() => setBooking('summary')}
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
          initialView={booking}
          onCreateLink={createShareLink}
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
          added={planned.has(detail.item.id)}
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
