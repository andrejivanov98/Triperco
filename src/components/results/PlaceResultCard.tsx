'use client'

import type { Place } from '@/lib/trip/types'
import { formatRating } from '@/lib/ui/format'
import { Badge, badgeTone } from '@/components/ui/Badge'
import { RemoteImage } from '@/components/ui/RemoteImage'

/** A thing to do: what it is and how it rates, then the photo. */
export function PlaceResultCard({
  place,
  badges = [],
  onOpen,
  onAdd,
  onOpenPhotos,
}: {
  place: Place
  badges?: string[]
  onOpen: () => void
  onAdd: () => void
  onOpenPhotos?: (index: number) => void
}) {
  const photo = place.photos[0]
  const rating = formatRating(place.rating, place.reviewCount)
  // Somewhere that has shut down can't be planned around, so it is never addable.
  const closedForGood = place.permanentlyClosed === true

  return (
    <div className="flex w-[19rem] shrink-0 snap-start flex-col gap-3 rounded-[22px] border border-hairline bg-white/60 p-3">
      <button type="button" onClick={onOpen} className="flex flex-col gap-1.5 text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-bold leading-snug text-ink">{place.name}</span>
          {badges.length > 0 && (
            <span className="flex shrink-0 flex-col items-end gap-1">
              {badges.slice(0, 2).map((b) => (
                <Badge key={b} label={b} tone={badgeTone(b)} />
              ))}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium">
          {rating ? (
            <span className="font-bold text-ink">★ {rating}</span>
          ) : (
            <span className="text-muted">No rating yet</span>
          )}
          {place.category && <span className="truncate text-muted">{place.category}</span>}
          {place.priceRange && <span className="text-muted">{place.priceRange}</span>}
        </div>

        {place.description && (
          <p className="line-clamp-2 text-xs font-medium leading-relaxed text-muted">
            {place.description}
          </p>
        )}

        <div className="flex flex-wrap gap-x-2 text-[11px] font-medium text-muted">
          {closedForGood ? (
            <span className="font-bold text-red-600">Closed down</span>
          ) : (
            place.openNow !== undefined && (
              <span className={place.openNow ? 'font-bold text-accent-600' : undefined}>
                {place.openNow ? 'Open now' : 'Closed right now'}
              </span>
            )
          )}
          {place.hours && <span className="truncate">{place.hours}</span>}
          {place.address && <span className="truncate">{place.address.split(',')[0]}</span>}
        </div>
      </button>

      <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-[16px] bg-sand">
        <button
          type="button"
          aria-label={photo ? `Open photos of ${place.name}` : `View details for ${place.name}`}
          onClick={() => (photo ? onOpenPhotos?.(0) : onOpen())}
          className="block h-full w-full"
        >
          <RemoteImage
            src={photo}
            alt={place.name}
            fallbackGlyph="🎫"
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {closedForGood ? (
          <span className="flex-1 rounded-xl border border-hairline bg-sand/60 px-3 py-2 text-center text-xs font-bold text-muted">
            Not available
          </span>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="flex-1 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white shadow-sm shadow-accent/25 transition hover:bg-accent-600"
          >
            Add to trip
          </button>
        )}
        {place.sourceLinks?.maps && (
          <a
            href={place.sourceLinks.maps}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-sand"
          >
            Open ↗
          </a>
        )}
      </div>
    </div>
  )
}
