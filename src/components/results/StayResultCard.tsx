'use client'

import { useState } from 'react'
import type { Stay } from '@/lib/trip/types'
import { formatMoney, formatRating } from '@/lib/ui/format'
import { Badge, badgeTone } from '@/components/ui/Badge'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { Icon, type IconName } from '@/components/ui/Icon'

/** "Entire place · 2 bedrooms · Sleeps 4" — whatever the provider actually told us. */
function layoutLine(stay: Stay): string | undefined {
  const info = (stay.essentialInfo ?? []).filter((i) =>
    /bed|bedroom|sleeps|studio|apartment|room|guest/i.test(i),
  )
  return info.length ? info.slice(0, 2).join(' · ') : undefined
}

function typeLine(stay: Stay): string {
  const kind = stay.kind === 'vacation_rental' ? 'Entire place' : (stay.hotelClass ?? 'Hotel')
  const where = stay.address?.split(',')[0]
  return [kind, where].filter(Boolean).join(' · ')
}

/** The handful of amenities travelers actually decide on, with a glyph each. */
const AMENITY_ICONS: { pattern: RegExp; icon: IconName; label: string }[] = [
  { pattern: /wi-?fi/i, icon: 'wifi', label: 'Wi-Fi' },
  { pattern: /kitchen/i, icon: 'kitchen', label: 'Kitchen' },
  { pattern: /air condition/i, icon: 'snowflake', label: 'A/C' },
  { pattern: /pool/i, icon: 'pool', label: 'Pool' },
  { pattern: /parking/i, icon: 'parking', label: 'Parking' },
  { pattern: /breakfast/i, icon: 'coffee', label: 'Breakfast' },
  { pattern: /washer|laundry/i, icon: 'washer', label: 'Washer' },
  { pattern: /pet/i, icon: 'paw', label: 'Pets' },
]

function amenityChips(stay: Stay): { icon: IconName; label: string }[] {
  const all = stay.amenities ?? []
  return AMENITY_ICONS.filter(({ pattern }) => all.some((a) => pattern.test(a)))
    .slice(0, 4)
    .map(({ icon, label }) => ({ icon, label }))
}

/**
 * One stay, as a single object you tap.
 *
 * It used to carry its own Add and Details buttons, which made a row of cards feel like a form.
 * Tapping the card opens the full detail, and adding happens there — one decision at a time.
 */
export function StayResultCard({
  stay,
  badges = [],
  onOpen,
}: {
  stay: Stay
  badges?: string[]
  onOpen: () => void
  /** Kept for callers that still pass them; the card no longer shows its own controls. */
  onAdd?: () => void
  onOpenPhotos?: (index: number) => void
}) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = stay.photos.slice(0, 6)
  const total = stay.totalPrice ?? stay.pricePerNight * stay.nights
  const layout = layoutLine(stay)
  const amenities = amenityChips(stay)
  const rating = formatRating(stay.rating, stay.reviewCount)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      aria-label={`${stay.name} — see details`}
      data-testid="stay-card"
      className="group flex h-[27rem] w-[min(19rem,80vw)] shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-[22px] border border-hairline bg-white/70 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Photo first, Airbnb-style, with the badge floating on it. */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-sand">
        <RemoteImage
          src={photos[photoIndex]}
          alt={stay.name}
          fallbackGlyph="🏨"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
        />
        {badges.length > 0 && (
          <span className="absolute left-2.5 top-2.5 flex gap-1">
            {badges.slice(0, 2).map((b) => (
              <Badge key={b} label={b} tone={badgeTone(b)} />
            ))}
          </span>
        )}
        {photos.length > 1 && (
          <span className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1} of ${stay.name}`}
                aria-current={i === photoIndex}
                onClick={(e) => {
                  e.stopPropagation()
                  setPhotoIndex(i)
                }}
                className={
                  'h-1.5 rounded-full transition ' +
                  (i === photoIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90')
                }
              />
            ))}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-bold leading-snug text-ink">{stay.name}</span>
          {rating && (
            <span className="shrink-0 text-xs font-bold text-ink">
              ★ <span className="font-semibold">{rating}</span>
            </span>
          )}
        </div>

        <div className="truncate text-xs font-medium text-muted">{typeLine(stay)}</div>
        {layout && <div className="truncate text-xs font-medium text-muted">{layout}</div>}

        {amenities.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <span
                key={a.label}
                className="flex items-center gap-1 rounded-full border border-hairline bg-white px-2 py-1 text-[10px] font-semibold text-muted"
              >
                <Icon name={a.icon} className="h-3 w-3" />
                {a.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-hairline pt-2.5">
          <span className="text-sm font-bold text-ink">
            {formatMoney(stay.pricePerNight)}
            <span className="text-[11px] font-semibold text-muted"> / night</span>
          </span>
          {total > 0 && (
            <span className="text-[11px] font-medium text-muted">
              {formatMoney(total)} · {stay.nights} night{stay.nights === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
