import type { Flight } from '@/lib/trip/types'
import { formatMoney, formatDuration, formatStops } from '@/lib/ui/format'
import { Badge, badgeTone } from '@/components/ui/Badge'

/** A flight itinerary as a route line: times at each end, duration and stops in between. */
export function FlightResultCard({
  flight,
  badges = [],
  onOpen,
  onAdd,
}: {
  flight: Flight
  badges?: string[]
  onOpen: () => void
  onAdd: () => void
}) {
  const stops = formatStops(flight.stops, flight.layovers?.map((l) => l.code))
  const cabin = flight.segments?.find((s) => s.cabin)?.cabin
  const featured = badges.includes('Best value')

  return (
    <div
      className={
        'flex w-[19rem] shrink-0 snap-start flex-col gap-3 rounded-[20px] border bg-white/60 p-4 transition hover:shadow-md ' +
        (featured ? 'border-accent/40 ring-1 ring-accent/25' : 'border-hairline')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {flight.airlineLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flight.airlineLogo} alt="" className="h-6 w-6 rounded object-contain" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded bg-sand text-xs">✈</span>
          )}
          <span className="truncate text-xs font-bold text-ink">{flight.airline ?? 'Flight'}</span>
        </div>
        {badges.length > 0 && (
          <div className="flex shrink-0 gap-1">
            {badges.slice(0, 2).map((b) => (
              <Badge key={b} label={b} tone={badgeTone(b)} />
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={onOpen} aria-label={`View details for ${flight.from} to ${flight.to}`} className="text-left">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-lg font-bold leading-tight text-ink">{flight.departTime ?? '—'}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{flight.from}</div>
          </div>

          <div className="flex flex-1 flex-col items-center gap-0.5 px-1">
            <span className="text-[10px] font-semibold text-muted">
              {formatDuration(flight.durationMinutes) ?? ''}
            </span>
            <span className="flex w-full items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="h-px flex-1 bg-hairline" />
              <span className="text-[10px] text-muted">✈</span>
              <span className="h-px flex-1 bg-hairline" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="text-[10px] font-semibold text-muted">{stops}</span>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold leading-tight text-ink">{flight.arriveTime ?? '—'}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{flight.to}</div>
          </div>
        </div>

        {(cabin || flight.arriveDate) && (
          <div className="mt-2 flex flex-wrap gap-x-2 text-[11px] font-medium text-muted">
            {cabin && <span>{cabin}</span>}
            {flight.arriveDate && flight.departDate && flight.arriveDate !== flight.departDate && (
              <span>Arrives {flight.arriveDate}</span>
            )}
          </div>
        )}
      </button>

      <div className="mt-auto flex items-end justify-between gap-2 border-t border-hairline pt-3">
        <div>
          <div className="text-base font-bold text-ink">{formatMoney(flight.price)}</div>
          <div className="text-[10px] font-medium text-muted">per traveler</div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-accent/25 transition hover:bg-accent-600"
        >
          Add to trip
        </button>
      </div>
    </div>
  )
}
