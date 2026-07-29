'use client'

import { useState } from 'react'
import type { Flight } from '@/lib/trip/types'
import { arrivalDayLabel } from '@/lib/trip/flightDay'
import { FlightSegments } from './FlightSegments'
import { formatMoney, formatDuration, formatStops } from '@/lib/ui/format'
import { Badge, badgeTone } from '@/components/ui/Badge'
import { RemoteImage } from '@/components/ui/RemoteImage'

/** One leg as a route line: times at each end, duration and stops in between. */
function Leg({ flight, label }: { flight: Flight; label?: string }) {
  const stops = formatStops(flight.stops, flight.layovers?.map((l) => l.code))
  const dayLabel = arrivalDayLabel(flight)

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <div>
          <div className="text-base font-bold leading-tight text-ink">{flight.departTime ?? '—'}</div>
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
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-base font-bold leading-tight text-ink">{flight.arriveTime ?? '—'}</span>
            {/* Landing a day later changes which night you need a bed for, so say it. */}
            {dayLabel && (
              <span
                data-testid="arrival-day-offset"
                className="rounded bg-sand px-1 text-[10px] font-bold text-ink"
              >
                {dayLabel}
              </span>
            )}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{flight.to}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-2 text-[10px] font-medium text-muted">
        {flight.departDate && <span>{flight.departDate}</span>}
        {flight.arriveDate && flight.arriveDate !== flight.departDate && (
          <span>arrives {flight.arriveDate}</span>
        )}
      </div>
    </div>
  )
}

/**
 * A flight option. A round trip shows both legs on one card, because the provider sells the pair as
 * a single fare — choosing it fills the whole journey.
 */
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
  const [expanded, setExpanded] = useState(false)
  const cabin = flight.segments?.find((s) => s.cabin)?.cabin
  const featured = badges.includes('Best value')
  const roundTrip = Boolean(flight.returnLeg)
  const isReturn = flight.direction === 'return' && !roundTrip

  return (
    <div
      className={
        'flex w-[21rem] shrink-0 snap-start flex-col gap-3 overflow-hidden rounded-[20px] border bg-white/60 p-4 transition hover:shadow-md ' +
        (expanded ? 'max-h-[36rem] ' : 'h-[23rem] ') +
        (featured ? 'border-accent/40 ring-1 ring-accent/25' : 'border-hairline')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <RemoteImage
            src={flight.airlineLogo}
            alt={flight.airline ?? 'Airline'}
            fallbackGlyph="✈"
            className="h-6 w-6 rounded object-contain"
            fallbackClassName="text-xs"
          />
          <span className="truncate text-xs font-bold text-ink">{flight.airline ?? 'Flight'}</span>
          <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            {roundTrip ? 'Round trip' : isReturn ? 'Return' : 'One way'}
          </span>
        </div>
        {badges.length > 0 && (
          <div className="flex shrink-0 gap-1">
            {badges.slice(0, 2).map((b) => (
              <Badge key={b} label={b} tone={badgeTone(b)} />
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <Leg flight={flight} label={roundTrip ? 'Outbound' : undefined} />
        {flight.returnLeg && (
          <>
            <span className="h-px w-full bg-hairline" />
            <Leg flight={flight.returnLeg} label="Return" />
          </>
        )}
        {cabin && <span className="text-[11px] font-medium text-muted">{cabin}</span>}

        {/* The whole journey, hop by hop — where you stop, for how long, on what. */}
        {expanded && (
          <div className="flex flex-col gap-4 border-t border-hairline pt-3">
            <FlightSegments flight={flight} />
            {flight.returnLeg && (
              <div className="border-t border-hairline pt-3">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-muted">
                  Return
                </span>
                <FlightSegments flight={flight.returnLeg} />
              </div>
            )}
          </div>
        )}
      </div>

      {(flight.segments?.length ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="shrink-0 self-start text-[11px] font-bold text-accent-600 transition hover:text-accent"
        >
          {expanded ? 'Hide the journey ▲' : 'See the journey ▼'}
        </button>
      )}

      <div className="mt-auto flex shrink-0 items-end justify-between gap-2 border-t border-hairline pt-3">
        <div>
          <div className="text-base font-bold text-ink">{formatMoney(flight.price)}</div>
          <div className="text-[10px] font-medium text-muted">
            {roundTrip ? 'both legs, per traveler' : 'per traveler'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            aria-label={`View details for ${flight.from} to ${flight.to}`}
            className="rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-sand"
          >
            Details
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-xl bg-deep px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-ink"
          >
            {roundTrip ? 'Select both' : 'Select flight'}
          </button>
        </div>
      </div>
    </div>
  )
}
