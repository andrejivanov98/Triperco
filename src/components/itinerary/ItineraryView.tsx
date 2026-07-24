import type { TripState } from '@/lib/trip/types'
import { buildTimeline, type AddSlot } from '@/lib/trip/timeline'
import { computeWatchouts } from '@/lib/trip/watchouts'
import { nightsBetween, formatDateRange } from '@/lib/trip/dates'
import { formatMoney } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { TimelineItemCard } from './TimelineItemCard'
import { WatchoutBanner } from './WatchoutBanner'

const ADD_SLOT_LABEL: Record<AddSlot, string> = {
  flights: '✈  Search flights',
  activities: '🎫  Add things to do',
}

export function ItineraryView({ trip }: { trip: TripState }) {
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

  const isEmpty =
    trip.flights.length === 0 && trip.stays.length === 0 && trip.days.length === 0

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Hero */}
      <div className="relative h-32 w-full overflow-hidden rounded-2xl">
        {trip.meta.coverImage ? (
          // Data-driven external host — plain img avoids next/image allowlisting.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.meta.coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-accent-050 to-sand" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-deep/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <Heading level={2} className="text-2xl text-white">
            {title}
          </Heading>
          {subParts.length > 0 && (
            <div className="mt-0.5 text-xs font-medium text-white/85">{subParts.join(' · ')}</div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        <WatchoutBanner watchouts={watchouts} />

        {isEmpty ? (
          <p className="mt-6 text-center text-sm font-medium text-muted">
            Your trip will appear here as we build it together.
          </p>
        ) : (
          <div className="glass flex flex-col gap-4 p-4">
            <div className="text-sm font-bold text-ink">{timeline.headerLabel}</div>
            {timeline.groups.map((g, gi) => (
              <div key={gi} className="flex flex-col gap-2">
                {g.label && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {g.label}
                  </div>
                )}
                {g.items.map((item) => (
                  <TimelineItemCard key={`${item.kind}-${item.id}`} item={item} />
                ))}
                {g.addSlots.map((slot) => (
                  <div
                    key={slot}
                    className="rounded-2xl border border-dashed border-hairline px-4 py-3 text-sm font-medium text-muted"
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Trip total
          </div>
          <div className="text-lg font-bold text-ink">{formatMoney(trip.estimatedTotal)}</div>
        </div>
        <button
          type="button"
          className="rounded-2xl bg-deep px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-deep/20 disabled:opacity-50"
          disabled={isEmpty}
        >
          Continue to book →
        </button>
      </div>
    </div>
  )
}
