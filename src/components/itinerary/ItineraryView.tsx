import type { TripState, TripMeta } from '@/lib/trip/types'
import { buildTimeline, type AddSlot } from '@/lib/trip/timeline'
import { computeWatchouts } from '@/lib/trip/watchouts'
import { nightsBetween, formatDateRange } from '@/lib/trip/dates'
import { formatMoney } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { TimelineItemCard } from './TimelineItemCard'
import { WatchoutBanner } from './WatchoutBanner'
import { TripContext } from './TripContext'

const ADD_SLOT_LABEL: Record<AddSlot, string> = {
  flights: '✈  No flights yet',
  activities: '🎫  Nothing planned yet',
}

export function ItineraryView({
  trip,
  onFix,
  onEditMeta,
}: {
  trip: TripState
  onFix?: (prompt: string) => void
  onEditMeta?: (patch: Partial<TripMeta>) => void
}) {
  const timeline = buildTimeline(trip)
  const watchouts = computeWatchouts(trip)
  const title =
    trip.meta.title ?? (trip.meta.destination ? `${trip.meta.destination} trip` : 'Your trip')

  const nights = nightsBetween(trip.meta.startDate, trip.meta.endDate)
  const range = formatDateRange(trip.meta.startDate, trip.meta.endDate)
  const subParts = [
    range || null,
    nights !== undefined ? `${nights} night${nights === 1 ? '' : 's'}` : null,
    `${trip.meta.travelers} traveler${trip.meta.travelers === 1 ? '' : 's'}`,
  ].filter(Boolean)

  const flightTotal = trip.flights.reduce((sum, f) => sum + f.price, 0) * trip.meta.travelers
  const stayTotal = trip.stays.reduce((sum, s) => sum + s.pricePerNight * s.nights, 0)
  const isEmpty = trip.flights.length === 0 && trip.stays.length === 0 && trip.days.length === 0

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Hero */}
      <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-2xl">
        {trip.meta.coverImage ? (
          // Data-driven external host — plain img avoids next/image allowlisting.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.meta.coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-accent-050 to-sand" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-deep/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <Heading level={2} className="truncate text-lg text-white">
            {title}
          </Heading>
          {subParts.length > 0 && (
            <div className="mt-0.5 truncate text-[11px] font-medium text-white/85">
              {subParts.join(' · ')}
            </div>
          )}
        </div>
      </div>

      {onEditMeta && <TripContext meta={trip.meta} onEdit={onEditMeta} />}

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        <WatchoutBanner watchouts={watchouts} onFix={onFix} />

        {isEmpty ? (
          <div className="mt-6 flex flex-col items-center gap-1 px-4 text-center">
            <span className="text-2xl">🧭</span>
            <p className="text-sm font-semibold text-ink">Your plan builds here</p>
            <p className="text-xs font-medium leading-relaxed text-muted">
              Everything you add in the chat lands in this panel — flights, stays and each day.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {timeline.groups.map((g, gi) => (
              <div key={gi} className="flex flex-col gap-1.5">
                {g.label && (
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    {g.label}
                  </div>
                )}
                {g.items.map((item, i) => (
                  // Index-qualified: a shared trip loaded from an older payload can still
                  // contain a repeated id, and a duplicate key breaks the whole list.
                  <TimelineItemCard key={`${item.kind}-${item.id}-${i}`} item={item} />
                ))}
                {g.addSlots.map((slot) => (
                  <div
                    key={slot}
                    className="rounded-xl border border-dashed border-hairline px-3 py-2 text-xs font-medium text-muted"
                  >
                    {ADD_SLOT_LABEL[slot]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-hairline pt-2">
        {!isEmpty && (flightTotal > 0 || stayTotal > 0) && (
          <div className="mb-2 flex flex-col gap-0.5 text-[11px] font-medium text-muted">
            {flightTotal > 0 && (
              <div className="flex justify-between">
                <span>Flights{trip.meta.travelers > 1 ? ` × ${trip.meta.travelers}` : ''}</span>
                <span className="text-ink">{formatMoney(flightTotal)}</span>
              </div>
            )}
            {stayTotal > 0 && (
              <div className="flex justify-between">
                <span>Stays</span>
                <span className="text-ink">{formatMoney(stayTotal)}</span>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Trip total
            </div>
            <div className="text-lg font-bold text-ink">{formatMoney(trip.estimatedTotal)}</div>
          </div>
          <button
            type="button"
            className="rounded-2xl bg-deep px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-deep/20 disabled:opacity-40"
            disabled={isEmpty}
          >
            Book it →
          </button>
        </div>
      </div>
    </div>
  )
}
