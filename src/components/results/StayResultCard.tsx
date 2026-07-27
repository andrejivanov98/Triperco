'use client'

import { useState } from 'react'
import type { Stay } from '@/lib/trip/types'
import { formatMoney } from '@/lib/ui/format'
import { Badge, badgeTone } from '@/components/ui/Badge'

/** "1 bedroom · 2 beds" style line, from whatever the provider gave us. */
function bedsLine(stay: Stay): string | undefined {
  const info = stay.essentialInfo ?? []
  const beds = info.filter((i) => /bed|bedroom|sleeps|studio|apartment/i.test(i))
  return beds.length ? beds.slice(0, 2).join(' · ') : undefined
}

function descriptionLine(stay: Stay): string {
  const kind = stay.kind === 'vacation_rental' ? 'Apartment' : stay.hotelClass ?? 'Hotel'
  const where = stay.address?.split(',')[0]
  return [kind, where].filter(Boolean).join(' in ')
}

/** A large, photo-led stay card — the main thing the traveler compares. */
export function StayResultCard({
  stay,
  badges = [],
  onOpen,
  onAdd,
  onOpenPhotos,
}: {
  stay: Stay
  badges?: string[]
  onOpen: () => void
  onAdd: () => void
  onOpenPhotos?: (index: number) => void
}) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = stay.photos.slice(0, 6)
  const total = stay.totalPrice ?? stay.pricePerNight * stay.nights
  const beds = bedsLine(stay)

  return (
    <div className="flex w-[19rem] shrink-0 snap-start flex-col gap-2.5">
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-sand">
        {photos.length > 0 ? (
          <button
            type="button"
            aria-label={`Open photos of ${stay.name}`}
            onClick={() => onOpenPhotos?.(photoIndex)}
            className="block h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[photoIndex]}
              alt={stay.name}
              className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`View details for ${stay.name}`}
            onClick={onOpen}
            className="flex h-full w-full items-center justify-center text-4xl"
          >
            🏨
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
          aria-label={`Add ${stay.name} to trip`}
          onClick={onAdd}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg text-deep shadow-sm transition hover:scale-105 hover:bg-white"
        >
          ♥
        </button>

        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1} of ${stay.name}`}
                aria-current={i === photoIndex}
                onClick={() => setPhotoIndex(i)}
                className={
                  'h-1.5 rounded-full transition ' +
                  (i === photoIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90')
                }
              />
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={onOpen} className="flex flex-col gap-1 text-left">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-bold text-ink">{stay.name}</span>
          {total > 0 && <span className="shrink-0 text-sm font-bold text-ink">{formatMoney(total)}</span>}
        </div>

        <div className="flex items-baseline justify-between gap-3 text-xs font-medium text-muted">
          <span className="truncate">
            {stay.rating !== undefined && (
              <span className="text-ink">
                ★ {stay.rating}
                {stay.reviewCount !== undefined && ` (${stay.reviewCount.toLocaleString('en-US')})`}
              </span>
            )}
            {beds && <span>{stay.rating !== undefined ? ` · ${beds}` : beds}</span>}
          </span>
          {stay.pricePerNight > 0 && (
            <span className="shrink-0">{formatMoney(stay.pricePerNight)}/night</span>
          )}
        </div>

        <div className="truncate text-xs font-medium text-muted">{descriptionLine(stay)}</div>
      </button>
    </div>
  )
}
