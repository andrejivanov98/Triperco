'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import type { SetRevision } from '@/lib/ui/revisions'
import { rankResults } from '@/lib/ui/rank'
import { Lightbox } from '@/components/ui/Lightbox'
import { StayResultCard } from './StayResultCard'
import { FlightResultCard } from './FlightResultCard'
import { PlaceResultCard } from './PlaceResultCard'

const KIND_NOUN: Record<ResultSet['kind'], string> = {
  flights: 'flight options',
  stays: 'places to stay',
  places: 'spots',
}

/** Name the set for what it is, so one-ways, round trips and returns never blur together. */
function setLabel(set: ResultSet): string {
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
}: {
  set: ResultSet
  onOpen: (set: ResultSet, item: Flight | Stay | Place) => void
  onAdd: (set: ResultSet, item: Flight | Stay | Place) => void
  /** Where this set sits among the searches answering the same question. */
  revision?: SetRevision
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const [photos, setPhotos] = useState<{ title: string; list: string[]; index: number } | null>(null)
  const [reopened, setReopened] = useState(false)

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

  const ranked = rankResults(set)
  if (ranked.length === 0) return null

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

  const hidden = set.items.length - ranked.length
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
          {hidden > 0 && <span>· showing the best {ranked.length}</span>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" aria-label="Scroll left" onClick={() => step(-1)} disabled={atStart} className={arrow}>
            ←
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => step(1)} disabled={atEnd} className={arrow}>
            →
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
              onOpen={() => onOpen(set, place)}
              onAdd={() => onAdd(set, place)}
              onOpenPhotos={(index) => setPhotos({ title: place.name, list: place.photos, index })}
            />
          )
        })}
      </div>

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
