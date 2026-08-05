'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Flight, Stay, Place, TripMeta } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import type { RankedItem } from '@/lib/ui/rank'
import type { SetRevision } from '@/lib/ui/revisions'
import { activityKindLabel } from '@/lib/trip/activityKind'
import { rankResults, MAX_CARDS } from '@/lib/ui/rank'
import { idsToEnrich, mergePlaceDetails, type PlaceDetail } from '@/lib/ui/enrichPlaces'
import { Lightbox } from '@/components/ui/Lightbox'
import { Icon } from '@/components/ui/Icon'
import { StayResultCard } from './StayResultCard'
import { FlightResultCard } from './FlightResultCard'
import { PlaceResultCard } from './PlaceResultCard'
import { ProviderCheckNote } from './ProviderCheckNote'

const KIND_NOUN: Record<ResultSet['kind'], string> = {
  flights: 'flight options',
  stays: 'places to stay',
  places: 'things to do',
}

/** Name the set for what it is, so one-ways, round trips and returns never blur together. */
function setLabel(set: ResultSet): string {
  if (set.kind === 'places') {
    return `${set.items.length} ${activityKindLabel(set.placeKind ?? 'attraction', set.items.length)}`
  }
  if (set.kind !== 'flights') return `${set.items.length} ${KIND_NOUN[set.kind]}`
  const noun =
    set.flightType === 'round_trip'
      ? 'round trips'
      : set.flightType === 'return'
        ? 'ways home'
        : 'one-way flights'
  return `${set.items.length} ${noun}`
}

/** One card plus its gap — how far an arrow press moves the track. */
const STEP = 320

export function ResultCarousel({
  set,
  onOpen,
  onAdd,
  revision,
  tripDates,
  plannedIds,
}: {
  set: ResultSet
  onOpen: (set: ResultSet, item: Flight | Stay | Place) => void
  onAdd: (set: ResultSet, item: Flight | Stay | Place) => void
  /** Where this set sits among the searches answering the same question. */
  revision?: SetRevision
  /** Ids already in the plan, so a card can say so instead of inviting a second press. */
  plannedIds?: Set<string>
  /** So an event outside the trip window can say so on its card. */
  tripDates?: Pick<TripMeta, 'startDate' | 'endDate'>
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const [photos, setPhotos] = useState<{ title: string; list: string[]; index: number } | null>(null)
  const [reopened, setReopened] = useState(false)
  // Everything the search returned, once they've asked for it. Costs nothing: it is already here.
  const [expanded, setExpanded] = useState(false)
  // Photos and reviews fetched for cards the search did not fill in, keyed by place id.
  const [details, setDetails] = useState<Record<string, PlaceDetail>>({})

  const sync = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    sync()
    const el = trackRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sync])

  function step(direction: -1 | 1) {
    const el = trackRef.current
    if (!el) return
    // scrollLeft rather than scrollBy: same result, and it works without layout in tests.
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + direction * STEP))
    sync()
  }

  /*
   * Only the first few places arrive from the search with photos and a review; fetching all twenty
   * would have cost forty provider calls for cards most travelers never scroll to. So the rest fill
   * in from one batch request, and again when the set is expanded.
   */
  const visible = useMemo(
    () => rankResults(set, expanded ? set.items.length : MAX_CARDS),
    [set, expanded],
  )
  const pending = useMemo(
    () => (set.kind === 'places' ? idsToEnrich(visible.map((v) => v.item as Place)) : []),
    [set.kind, visible],
  )
  // A stable key, so this runs once per genuinely new group of ids rather than on every render.
  const pendingKey = pending.join(',')

  useEffect(() => {
    if (pendingKey.length === 0) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/places/details', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ placeIds: pendingKey.split(',') }),
        })
        if (!res.ok || cancelled) return
        const { places } = (await res.json()) as { places?: Record<string, PlaceDetail> }
        if (places && !cancelled) setDetails((current) => ({ ...current, ...places }))
      } catch {
        // Cards keep whatever the search gave them; a missing gallery is cosmetic.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pendingKey])

  const ranked = useMemo(() => {
    if (set.kind !== 'places' || Object.keys(details).length === 0) return visible
    const merged = mergePlaceDetails(visible.map((v) => v.item as Place), details)
    return visible.map((entry, i) => ({ ...entry, item: merged[i] }) as RankedItem)
  }, [visible, details, set.kind])

  if (ranked.length === 0) return null
  // How many more the search already found. Nothing extra is fetched to show them.
  const remaining = rankResults(set, set.items.length).length - ranked.length

  // A newer search answered this same question, so this set is history — collapse it rather than
  // leaving four dead carousels between the traveler and the live one. Nothing is deleted.
  if (revision?.superseded && !reopened) {
    return (
      <button
        type="button"
        data-testid="superseded-set"
        onClick={() => setReopened(true)}
        className="mt-1 flex w-full items-center gap-2 rounded-xl border border-hairline bg-sand/40 px-3 py-2 text-left text-xs font-semibold text-muted transition hover:bg-sand"
      >
        <span className="text-[10px]">↩</span>
        <span className="truncate">
          Earlier search · {setLabel(set)}
          {set.query ? ` · ${set.query}` : ''}
        </span>
        <span className="ml-auto shrink-0 text-accent-600">Show</span>
      </button>
    )
  }

  const arrow =
    'hidden h-7 w-7 items-center justify-center rounded-full border border-hairline bg-white/80 text-xs font-bold text-ink transition hover:bg-white disabled:opacity-30 sm:flex'

  return (
    // min-w-0 + max-w-full keep the track from widening the chat column.
    <div data-testid="carousel" className="mt-1 flex min-w-0 max-w-full flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-xs font-semibold text-muted">
          <span className="text-ink">{setLabel(set)}</span>
          {set.query && <span className="truncate">{set.query}</span>}
          {/* Say that this replaced an earlier search, so a changed list doesn't look like a new one. */}
          {revision && revision.revision > 1 && !revision.superseded && (
            <span
              data-testid="revised-badge"
              className="rounded-full bg-accent-050 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-600"
            >
              Updated
            </span>
          )}
          {revision?.superseded && reopened && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Earlier search
            </span>
          )}
          {remaining > 0 && <span>· showing the best {ranked.length}</span>}
          {expanded && <span>· showing all {ranked.length}</span>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" aria-label="Scroll left" onClick={() => step(-1)} disabled={atStart} className={arrow}>
            <Icon name="chevron-left" className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => step(1)} disabled={atEnd} className={arrow}>
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        data-testid="carousel-track"
        onScroll={sync}
        className="-mx-1 flex min-w-0 max-w-full snap-x gap-4 overflow-x-auto scroll-smooth px-1 pb-2"
      >
        {ranked.map((entry, i) => {
          const key = `${entry.item.id}-${i}`
          if (entry.kind === 'stays') {
            const stay = entry.item
            return (
              <StayResultCard
                key={key}
                stay={stay}
                badges={entry.badges}
                onOpen={() => onOpen(set, stay)}
                onAdd={() => onAdd(set, stay)}
                onOpenPhotos={(index) =>
                  setPhotos({ title: stay.name, list: stay.photos, index })
                }
              />
            )
          }
          if (entry.kind === 'flights') {
            const flight = entry.item
            return (
              <FlightResultCard
                key={key}
                flight={flight}
                badges={entry.badges}
                added={plannedIds?.has(flight.id) ?? false}
                onOpen={() => onOpen(set, flight)}
                onAdd={() => onAdd(set, flight)}
              />
            )
          }
          const place = entry.item
          return (
            <PlaceResultCard
              key={key}
              place={place}
              badges={entry.badges}
              added={plannedIds?.has(place.id) ?? false}
              tripDates={tripDates}
              onOpen={() => onOpen(set, place)}
              onAdd={() => onAdd(set, place)}
              onOpenPhotos={(index) => setPhotos({ title: place.name, list: place.photos, index })}
            />
          )
        })}

        {/*
          The rest of what this search already found, at the end of the track where the traveler
          runs out of cards. Expanding fetches nothing — these results are already in hand, and
          before this they were simply discarded.
        */}
        {remaining > 0 && (
          <button
            type="button"
            data-testid="show-all"
            onClick={() => setExpanded(true)}
            className="flex w-[min(11rem,45vw)] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[22px] border border-dashed border-hairline bg-white/40 px-4 text-center transition hover:border-accent/50 hover:bg-accent-050"
          >
            <span className="text-sm font-bold text-ink">Show all {ranked.length + remaining}</span>
            <span className="text-xs font-semibold text-muted">{remaining} more found</span>
          </button>
        )}
      </div>

      {/* Said where the choice is made, not buried at checkout. */}
      {(set.kind === 'flights' || set.kind === 'stays') && <ProviderCheckNote kind={set.kind} />}

      {photos && (
        <Lightbox
          photos={photos.list}
          startIndex={photos.index}
          title={photos.title}
          onClose={() => setPhotos(null)}
        />
      )}
    </div>
  )
}
