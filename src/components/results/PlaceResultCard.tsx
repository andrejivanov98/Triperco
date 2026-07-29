'use client'

import type { Place, TripMeta } from '@/lib/trip/types'
import { formatRating } from '@/lib/ui/format'
import { classifyActivity, eventOutsideTrip, showsOpeningHours } from '@/lib/trip/activityKind'
import { Badge, badgeTone } from '@/components/ui/Badge'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { AddButton, PRESSABLE } from '@/components/ui/AddButton'
import { Icon } from '@/components/ui/Icon'

/** A thing to do: what it is and how it rates, then the photo. */
export function PlaceResultCard({
  place,
  badges = [],
  tripDates,
  onOpen,
  onAdd,
  onOpenPhotos,
  added = false,
}: {
  place: Place
  badges?: string[]
  /** So an event that misses the trip can say so before it is added. */
  tripDates?: Pick<TripMeta, 'startDate' | 'endDate'>
  onOpen: () => void
  onAdd: () => void
  onOpenPhotos?: (index: number) => void
  /** Already in the plan, so the action becomes a state. */
  added?: boolean
}) {
  const photo = place.photos[0]
  const rating = formatRating(place.rating, place.reviewCount)
  // Somewhere that has shut down can't be planned around, so it is never addable.
  const closedForGood = place.permanentlyClosed === true
  const kind = classifyActivity(place)
  const clashes = tripDates ? eventOutsideTrip(place, tripDates) : false

  return (
    // A fixed frame: every card is the same size, so the photo and the buttons never shift.
    <div className="flex h-[26rem] w-[min(19rem,80vw)] shrink-0 snap-start flex-col gap-3 rounded-[22px] border border-hairline bg-white/60 p-3">
      <button type="button" onClick={onOpen} className="flex h-[7.5rem] shrink-0 flex-col gap-1.5 overflow-hidden text-left">
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
          ) : kind === 'event' ? (
            <>
              {/* An event is a date you can miss, so the date leads and a clash is stated. */}
              {place.whenLabel && <span className="truncate font-bold text-ink">{place.whenLabel}</span>}
              {!place.whenLabel && place.startDate && (
                <span className="font-bold text-ink">{place.startDate}</span>
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
          {place.address && <span className="truncate">{place.address.split(',')[0]}</span>}
        </div>
      </button>

      <div className="group relative h-40 w-full shrink-0 overflow-hidden rounded-[16px] bg-sand">
        <button
          type="button"
          aria-label={photo ? `Open photos of ${place.name}` : `View details for ${place.name}`}
          onClick={() => (photo ? onOpenPhotos?.(0) : onOpen())}
          className="block h-full w-full"
        >
          <RemoteImage
            src={photo}
            alt={place.name}
            fallbackGlyph={<Icon name="ticket" className="h-6 w-6" />}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        </button>
      </div>

      <div className="mt-auto flex items-center gap-2">
        {closedForGood ? (
          <span className="flex-1 rounded-xl border border-hairline bg-sand/60 px-3 py-2 text-center text-xs font-bold text-muted">
            Not available
          </span>
        ) : (
          <AddButton added={added} onAdd={onAdd} label="Add to trip" className="flex-1" />
        )}
        {/* Everything addable carries the place you actually book or check it. */}
        {(place.ticketUrl ?? place.sourceLinks?.maps) && (
          <a
            href={place.ticketUrl ?? place.sourceLinks?.maps}
            target="_blank"
            rel="noopener noreferrer"
            className={'rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-sand ' + PRESSABLE}
          >
            {place.ticketUrl ? 'Tickets ↗' : 'Open ↗'}
          </a>
        )}
      </div>
    </div>
  )
}
