'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { rankResults } from '@/lib/ui/rank'
import { ResultCard } from './ResultCard'

const KIND_NOUN: Record<ResultSet['kind'], string> = {
  flights: 'flight options',
  stays: 'places to stay',
  places: 'spots',
}

/** One card plus its gap — how far an arrow press moves the track. */
const STEP = 252

export function ResultCarousel({
  set,
  onOpen,
  onAdd,
}: {
  set: ResultSet
  onOpen: (set: ResultSet, item: Flight | Stay | Place) => void
  onAdd: (set: ResultSet, item: Flight | Stay | Place) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

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

  const hidden = set.items.length - ranked.length
  const arrow =
    'hidden h-7 w-7 items-center justify-center rounded-full border border-hairline bg-white/80 text-xs font-bold text-ink transition hover:bg-white disabled:opacity-30 sm:flex'

  return (
    // min-w-0 + max-w-full keep the track from widening the chat column.
    <div data-testid="carousel" className="mt-1 flex min-w-0 max-w-full flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-xs font-semibold text-muted">
          <span className="text-ink">
            {set.items.length} {KIND_NOUN[set.kind]}
          </span>
          {set.query && <span className="truncate">{set.query}</span>}
          {hidden > 0 && <span>· showing the best {ranked.length}</span>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => step(-1)}
            disabled={atStart}
            className={arrow}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => step(1)}
            disabled={atEnd}
            className={arrow}
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        data-testid="carousel-track"
        onScroll={sync}
        className="-mx-1 flex min-w-0 max-w-full snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-2"
      >
        {ranked.map(({ item, badges }) => (
          <div key={item.id} className="snap-start">
            <ResultCard
              kind={set.kind}
              item={item}
              badges={badges}
              onOpen={() => onOpen(set, item)}
              onAdd={() => onAdd(set, item)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
