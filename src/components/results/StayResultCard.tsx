'use client'

import { useState } from 'react'
import type { Stay } from '@/lib/trip/types'
import { formatMoney, formatRating } from '@/lib/ui/format'
import { Badge, badgeTone } from '@/components/ui/Badge'
import { RemoteImage } from '@/components/ui/RemoteImage'

/** "Entire apartment · Sleeps 8 · 2 bedrooms" — whatever the provider actually told us. */
function layoutLine(stay: Stay): string | undefined {
  const info = (stay.essentialInfo ?? []).filter((i) =>
    /bed|bedroom|sleeps|studio|apartment|room|guest/i.test(i),
  )
  return info.length ? info.slice(0, 3).join(' · ') : undefined
}

/** What kind of place it is, and roughly where. */
function typeLine(stay: Stay): string {
  const kind = stay.kind === 'vacation_rental' ? 'Entire place' : stay.hotelClass ?? 'Hotel'
  const where = stay.address?.split(',')[0]
  return [kind, where].filter(Boolean).join(' · ')
}

/** The handful of amenities travelers actually decide on. */
const HEADLINE_AMENITIES = [
  /wi-?fi/i,
  /kitchen/i,
  /air condition/i,
  /pool/i,
  /parking/i,
  /breakfast/i,
  /washer/i,
  /pet/i,
]

function headlineAmenities(stay: Stay): string[] {
  const all = stay.amenities ?? []
  const picked = HEADLINE_AMENITIES.flatMap((pattern) => all.filter((a) => pattern.test(a)).slice(0, 1))
  return [...new Set(picked)].slice(0, 4)
}

/** A large, detail-first stay card — everything you'd compare on, then the photos. */
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
  const layout = layoutLine(stay)
  const amenities = headlineAmenities(stay)
  const rating = formatRating(stay.rating, stay.reviewCount)

  return (
    <div className="flex w-[20rem] shrink-0 snap-start flex-col gap-3 rounded-[22px] border border-hairline bg-white/60 p-3">
      {/* Details first: what it is, how it rates, what it costs. */}
      <button type="button" onClick={onOpen} className="flex flex-col gap-1.5 text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-bold leading-snug text-ink">{stay.name}</span>
          {badges.length > 0 && (
            <span className="flex shrink-0 flex-col items-end gap-1">
              {badges.slice(0, 2).map((b) => (
                <Badge key={b} label={b} tone={badgeTone(b)} />
              ))}
            </span>
          )}
        </div>

        <div className="truncate text-xs font-medium text-muted">{typeLine(stay)}</div>

        <div className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium">
          {rating ? (
            <span className="font-bold text-ink">★ {rating}</span>
          ) : (
            <span className="text-muted">No rating yet</span>
          )}
          {layout && <span className="text-muted">{layout}</span>}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium text-muted">
          {stay.pricePerNight > 0 && (
            <span className="text-sm font-bold text-ink">{formatMoney(stay.pricePerNight)}/night</span>
          )}
          {total > 0 && (
            <span>
              {formatMoney(total)} total · {stay.nights} night{stay.nights === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {(stay.checkInTime || stay.locationRating !== undefined) && (
          <div className="flex flex-wrap gap-x-2 text-[11px] font-medium text-muted">
            {stay.checkInTime && <span>Check-in {stay.checkInTime}</span>}
            {stay.locationRating !== undefined && <span>Location {stay.locationRating}/5</span>}
          </div>
        )}

        {amenities.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {amenities.map((a) => (
              <span
                key={a}
                className="rounded-full border border-hairline bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-muted"
              >
                {a}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Then the photos. */}
      <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-[16px] bg-sand">
        <button
          type="button"
          aria-label={photos.length > 0 ? `Open photos of ${stay.name}` : `View details for ${stay.name}`}
          onClick={() => (photos.length > 0 ? onOpenPhotos?.(photoIndex) : onOpen())}
          className="block h-full w-full"
        >
          <RemoteImage
            src={photos[photoIndex]}
            alt={stay.name}
            fallbackGlyph="🏨"
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        </button>

        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
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

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white shadow-sm shadow-accent/25 transition hover:bg-accent-600"
        >
          Add to trip
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-sand"
        >
          Details
        </button>
      </div>
    </div>
  )
}
