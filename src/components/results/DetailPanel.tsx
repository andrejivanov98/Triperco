'use client'

import { useEffect, useState } from 'react'
import type { Flight, Stay, Place, TripMeta, ReviewSnippet } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { FlightDetail } from './detail/FlightDetail'
import { StayDetail } from './detail/StayDetail'
import { PlaceDetail } from './detail/PlaceDetail'

type Item = Flight | Stay | Place

function bookLabel(kind: ResultSet['kind'], item: Item): string {
  if (kind === 'flights') {
    const airline = (item as Flight).airline
    return airline ? `Book on ${airline}` : 'Book flight'
  }
  if (kind === 'stays') return 'Book stay'
  return 'Open in Maps'
}

function bookUrl(kind: ResultSet['kind'], item: Item): string | undefined {
  if (kind === 'places') return (item as Place).sourceLinks?.maps
  const url = (item as Flight | Stay).bookUrl
  return url || undefined
}

/**
 * Full detail for one option, as a modal over the whole app: everything the provider knows,
 * fetched on open so the traveler can decide without leaving Triperco.
 */
export function DetailPanel({
  kind,
  item,
  meta,
  onClose,
  onAdd,
}: {
  kind: ResultSet['kind']
  item: Item
  meta: TripMeta
  onClose: () => void
  onAdd: () => void
}) {
  const [stay, setStay] = useState<Stay>(kind === 'stays' ? (item as Stay) : ({} as Stay))
  const [place, setPlace] = useState<Place>(kind === 'places' ? (item as Place) : ({} as Place))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Enrich a stay from the provider's single-property endpoint.
  useEffect(() => {
    if (kind !== 'stays') return
    const s = item as Stay
    if (!s.propertyToken || !meta.startDate || !meta.endDate) return

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const res = await fetch('/api/stays/details', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            propertyToken: s.propertyToken,
            checkIn: meta.startDate,
            checkOut: meta.endDate,
            adults: meta.travelers,
          }),
        })
        if (!res.ok || cancelled) return
        const { stay: full } = (await res.json()) as { stay: Stay | null }
        if (full && !cancelled) setStay({ ...s, ...full, id: s.id, nights: s.nights })
      } catch {
        // Keep what the search already gave us.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [kind, item, meta.startDate, meta.endDate, meta.travelers])

  // Enrich a place with reviews and photos.
  useEffect(() => {
    if (kind !== 'places') return
    const p = item as Place
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const res = await fetch('/api/places/details', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ placeId: p.id }),
        })
        if (!res.ok || cancelled) return
        const { reviews, photos } = (await res.json()) as {
          reviews?: ReviewSnippet[]
          photos?: string[]
        }
        if (cancelled) return
        setPlace({
          ...p,
          reviewSnippets: reviews?.length ? reviews : p.reviewSnippets,
          photos: photos?.length ? photos : p.photos,
        })
      } catch {
        // Keep what the search already gave us.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [kind, item])

  const url = bookUrl(kind, item)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Dismiss details"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-deep/40 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Option details"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-hairline bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">
            {kind === 'flights' ? 'Flight details' : kind === 'stays' ? 'Stay details' : 'Place details'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm font-bold text-muted hover:bg-sand hover:text-ink"
          >
            Close ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {kind === 'flights' && <FlightDetail flight={item as Flight} />}
          {kind === 'stays' && <StayDetail stay={stay} loading={loading} />}
          {kind === 'places' && <PlaceDetail place={place} loading={loading} />}
        </div>

        <div className="flex items-center gap-2 border-t border-hairline bg-white/40 px-5 py-3">
          <button
            type="button"
            onClick={onAdd}
            className="flex-1 rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/25 transition hover:bg-accent-600"
          >
            Add to trip
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-deep px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              {bookLabel(kind, item)} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
