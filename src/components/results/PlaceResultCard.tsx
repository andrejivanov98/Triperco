'use client'

import { useState } from 'react'
import type { Place, TripMeta } from '@/lib/trip/types'
import { formatRating } from '@/lib/ui/format'
import {
  activityKindLabel,
  classifyActivity,
  eventOutsideTrip,
  showsOpeningHours,
} from '@/lib/trip/activityKind'
import { Badge, badgeTone } from '@/components/ui/Badge'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { Icon } from '@/components/ui/Icon'

/** "Trattoria · Trastevere" — what it is and roughly where, the way a stay card reads. */
function typeLine(place: Place): string | undefined {
  const where = place.address?.split(',')[0]?.trim()
  return [place.category, where].filter(Boolean).join(' · ') || undefined
}

/**
 * One thing to see or do, built as the same object as a stay: photo first, tap the card to open the
 * full detail, and add from there.
 *
 * It used to be the odd one out — a text block above a small photo, with its own Add and Open
 * buttons — which made a row of them read as a form next to the accommodation cards.
 */
export function PlaceResultCard({
  place,
  badges = [],
  tripDates,
  onOpen,
  added = false,
}: {
  place: Place
  badges?: string[]
  /** So an event that misses the trip can say so before it is added. */
  tripDates?: Pick<TripMeta, 'startDate' | 'endDate'>
  onOpen: () => void
  /** Already in the plan, so the card says so rather than inviting a second look. */
  added?: boolean
  /** Kept for callers that still pass them; the card no longer shows its own controls. */
  onAdd?: () => void
  onOpenPhotos?: (index: number) => void
}) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = place.photos.slice(0, 6)
  const rating = formatRating(place.rating, place.reviewCount)
  const kind = classifyActivity(place)
  const clashes = tripDates ? eventOutsideTrip(place, tripDates) : false
  const closedForGood = place.permanentlyClosed === true
  const quote = place.reviewSnippets?.[0]?.text?.trim()
  const type = typeLine(place)

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
      aria-label={`${place.name} — see details`}
      data-testid="place-card"
      className="group flex h-[27rem] w-[min(19rem,80vw)] shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-[22px] border border-hairline bg-white/70 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-sand">
        <RemoteImage
          src={photos[photoIndex]}
          alt={place.name}
          fallbackGlyph={<Icon name="ticket" className="h-6 w-6" />}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
        />

        {badges.length > 0 && (
          <span className="absolute left-2.5 top-2.5 flex gap-1">
            {badges.slice(0, 2).map((b) => (
              <Badge key={b} label={b} tone={badgeTone(b)} />
            ))}
          </span>
        )}

        {/* State, not an action: the card has no button to press twice. */}
        {added && (
          <span
            data-testid="place-added"
            className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-green-800"
          >
            <Icon name="check" className="h-3 w-3" />
            In your plan
          </span>
        )}

        {photos.length > 1 && (
          <span className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1} of ${place.name}`}
                aria-current={i === photoIndex}
                onClick={(e) => {
                  // Flipping a photo must not open the detail panel by accident.
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
          <span className="line-clamp-2 text-sm font-bold leading-snug text-ink">{place.name}</span>
          {rating && (
            <span className="shrink-0 text-xs font-bold text-ink">
              ★ <span className="font-semibold">{rating}</span>
            </span>
          )}
        </div>

        {type && <div className="truncate text-xs font-medium text-muted">{type}</div>}

        <div className="flex flex-wrap gap-x-2 text-[11px] font-medium text-muted">
          {closedForGood ? (
            <span className="font-bold text-red-600">Closed down</span>
          ) : kind === 'event' ? (
            <>
              {/* An event is a date you can miss, so the date leads and a clash is stated. */}
              {(place.whenLabel ?? place.startDate) && (
                <span className="truncate font-bold text-ink">
                  {place.whenLabel ?? place.startDate}
                </span>
              )}
              {clashes && (
                <span data-testid="event-clash" className="font-bold text-red-600">
                  Not during your trip
                </span>
              )}
            </>
          ) : (
            // Opening hours mean nothing for something you book rather than turn up to.
            showsOpeningHours(kind) &&
            place.openNow !== undefined && (
              <span className={place.openNow ? 'font-bold text-accent-600' : undefined}>
                {place.openNow ? 'Open now' : 'Closed right now'}
              </span>
            )
          )}
          {showsOpeningHours(kind) && place.hours && <span className="truncate">{place.hours}</span>}
          {kind === 'event' && place.venueName && <span className="truncate">{place.venueName}</span>}
        </div>

        {/*
          One real thing a visitor said. A rating is a number; this is the only part of the card that
          says what the place is actually like.
        */}
        {quote && (
          <p
            data-testid="place-quote"
            className="line-clamp-3 text-[11px] font-medium italic leading-relaxed text-muted"
          >
            “{quote}”
          </p>
        )}

        <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-hairline pt-2.5">
          {/*
            The provider's own price range when there is one, and otherwise what this is — never a
            guess. "Free to visit" would be a fact we invented, and most attractions charge.
          */}
          <span className="text-xs font-bold text-ink">
            {place.priceRange ?? activityKindLabel(kind, 1)}
          </span>
          <span className="text-[11px] font-semibold text-accent-600">See details</span>
        </div>
      </div>
    </div>
  )
}
