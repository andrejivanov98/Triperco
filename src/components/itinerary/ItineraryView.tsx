import type { TripState } from '@/lib/trip/types'
import { buildTimeline, type AddSlot, type TimelineItem } from '@/lib/trip/timeline'
import { computeWatchouts } from '@/lib/trip/watchouts'
import { formatMoney } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { TimelineItemCard } from './TimelineItemCard'
import { WatchoutBanner } from './WatchoutBanner'
import { AddSlotRow, slotPrompt } from './AddSlotRow'
import { ProgressMeter } from './ProgressMeter'
import { RemoteImage } from '@/components/ui/RemoteImage'

export function ItineraryView({
  trip,
  onFix,
  onRemoveItem,
  onViewItem,
  onContinueToBook,
}: {
  trip: TripState
  onFix?: (prompt: string) => void
  onRemoveItem?: (item: TimelineItem) => void
  onViewItem?: (item: TimelineItem) => void
  onContinueToBook?: () => void
}) {
  const timeline = buildTimeline(trip)
  const watchouts = computeWatchouts(trip)
  const title =
    trip.meta.title ?? (trip.meta.destination ? `${trip.meta.destination} trip` : 'Your trip')

  const flightTotal = trip.flights.reduce((sum, f) => sum + f.price, 0) * trip.meta.travelers
  const stayTotal = trip.stays.reduce((sum, s) => sum + s.pricePerNight * s.nights, 0)
  const isEmpty = trip.flights.length === 0 && trip.stays.length === 0 && trip.days.length === 0

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Hero */}
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl">
        <RemoteImage
          src={trip.meta.coverImage}
          alt={trip.meta.destination ? `${trip.meta.destination} cover photo` : 'Trip cover'}
          fallbackGlyph="🧭"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <Heading level={2} className="truncate text-lg text-white">
            {title}
          </Heading>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        <WatchoutBanner watchouts={watchouts} onFix={onFix} />

        {/* Say what is missing rather than leaving an empty panel to be interpreted. */}
        <ProgressMeter trip={trip} onAsk={onFix} />

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
                  <TimelineItemCard
                    key={`${item.kind}-${item.id}-${i}`}
                    item={item}
                    onRemove={onRemoveItem}
                    onViewDetails={onViewItem}
                  />
                ))}
                {g.addSlots.map((slot: AddSlot) => (
                  <AddSlotRow
                    key={slot}
                    slot={slot}
                    destination={trip.meta.destination}
                    dayLabel={g.label}
                    onClick={
                      onFix
                        ? (s, day) => onFix(slotPrompt(s, trip.meta.destination, day))
                        : undefined
                    }
                  />
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
            onClick={onContinueToBook}
            className="rounded-2xl bg-deep px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-deep/20 transition hover:opacity-90 disabled:opacity-40"
            disabled={isEmpty || !onContinueToBook}
          >
            Continue to book →
          </button>
        </div>
      </div>
    </div>
  )
}
