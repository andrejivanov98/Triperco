'use client'

import type { Place } from '@/lib/trip/types'
import { Badge, badgeTone } from '@/components/ui/Badge'
import { RemoteImage } from '@/components/ui/RemoteImage'

/** A thing to do: photo-led, with the rating and what kind of place it is. */
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

  return (
    <div className="flex w-[17rem] shrink-0 snap-start flex-col gap-2.5">
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-sand">
        {photo ? (
          <button
            type="button"
            aria-label={`Open photos of ${place.name}`}
            onClick={() => onOpenPhotos?.(0)}
            className="block h-full w-full"
          >
            <RemoteImage
              src={photo}
              alt={place.name}
              fallbackGlyph="🎫"
              className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`View details for ${place.name}`}
            onClick={onOpen}
            className="flex h-full w-full items-center justify-center text-4xl"
          >
            🎫
          </button>
        )}

        {badges.length > 0 && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1">
            {badges.slice(0, 2).map((b) => (
              <Badge key={b} label={b} tone={badgeTone(b)} />
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label={`Add ${place.name} to trip`}
          onClick={onAdd}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg text-deep shadow-sm transition hover:scale-105 hover:bg-white"
        >
          ♥
        </button>
      </div>

      <button type="button" onClick={onOpen} className="flex flex-col gap-1 text-left">
        <span className="truncate text-sm font-bold text-ink">{place.name}</span>

        <span className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium text-muted">
          {place.rating !== undefined && (
            <span className="text-ink">
              ★ {place.rating}
              {place.reviewCount !== undefined && ` (${place.reviewCount.toLocaleString('en-US')})`}
            </span>
          )}
          {place.category && <span className="truncate">{place.category}</span>}
          {place.priceRange && <span>{place.priceRange}</span>}
        </span>

        {/* Duration and from-price only exist once a tours provider is wired in. */}
        <span className="flex flex-wrap gap-x-2 text-xs font-medium text-muted">
          {place.openNow !== undefined && (
            <span className={place.openNow ? 'text-accent-600' : undefined}>
              {place.openNow ? 'Open now' : 'Closed now'}
            </span>
          )}
          {place.hours && <span className="truncate">{place.hours}</span>}
        </span>
      </button>
    </div>
  )
}
