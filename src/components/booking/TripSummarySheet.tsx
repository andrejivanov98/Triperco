import type { TripState } from '@/lib/trip/types'
import { buildTimeline } from '@/lib/trip/timeline'
import { arrivalDayLabel } from '@/lib/trip/flightDay'
import { formatMoney, formatDuration, formatStops } from '@/lib/ui/format'
import { formatDateRange } from '@/lib/trip/dates'

/**
 * The trip as a document: every part of the plan, in order, with the detail someone would want
 * while actually travelling.
 *
 * Printing used to put the chat on paper, because window.print() prints the page. This is what goes
 * on the page instead — no conversation, no buttons, just the itinerary.
 */
export function TripSummarySheet({ trip }: { trip: TripState }) {
  const title = trip.meta.title ?? `${trip.meta.destination ?? 'Your'} trip`
  const range = formatDateRange(trip.meta.startDate, trip.meta.endDate)
  // The plan's own activity rows, flattened out of their day groups for a printed list.
  const activities = buildTimeline(trip)
    .groups.flatMap((group) => group.items)
    .filter((item) => item.kind === 'activity')

  const flightTotal = trip.flights.reduce((sum, f) => sum + f.price, 0) * trip.meta.travelers
  const stayTotal = trip.stays.reduce((sum, s) => sum + (s.totalPrice ?? s.pricePerNight * s.nights), 0)

  return (
    <div className="flex flex-col gap-6 text-ink">
      <header className="border-b border-hairline pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Trip summary</p>
        <h1 className="mt-1 font-display text-3xl leading-tight">{title}</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          {[range, `${trip.meta.travelers} traveler${trip.meta.travelers === 1 ? '' : 's'}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      {trip.flights.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Flights</h2>
          {trip.flights.map((flight, i) => {
            const nextDay = arrivalDayLabel(flight)
            return (
              <div
                key={`${flight.id}-${i}`}
                className="flex flex-col gap-1 rounded-2xl border border-hairline p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold">
                    {flight.direction === 'return' ? 'Return' : 'Outbound'} · {flight.from} →{' '}
                    {flight.to}
                  </span>
                  {flight.price > 0 && (
                    <span className="text-sm font-bold">{formatMoney(flight.price)}</span>
                  )}
                </div>
                <div className="text-sm font-medium">
                  {flight.departDate && <span>{flight.departDate} · </span>}
                  {flight.departTime ?? '—'} → {flight.arriveTime ?? '—'}
                  {nextDay && <span className="font-bold"> {nextDay}</span>}
                </div>
                <div className="text-xs font-medium text-muted">
                  {[
                    flight.airline,
                    formatDuration(flight.durationMinutes),
                    formatStops(flight.stops, flight.layovers?.map((l) => l.code)),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {trip.stays.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Where you are staying</h2>
          {trip.stays.map((stay) => (
            <div key={stay.id} className="flex flex-col gap-1 rounded-2xl border border-hairline p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold">{stay.name}</span>
                <span className="text-sm font-bold">
                  {formatMoney(stay.totalPrice ?? stay.pricePerNight * stay.nights)}
                </span>
              </div>
              <div className="text-sm font-medium">
                {range} · {stay.nights} night{stay.nights === 1 ? '' : 's'}
              </div>
              {stay.address && <div className="text-xs font-medium text-muted">{stay.address}</div>}
              <div className="text-xs font-medium text-muted">
                {[
                  stay.checkInTime && `Check-in ${stay.checkInTime}`,
                  stay.checkOutTime && `Check-out ${stay.checkOutTime}`,
                  stay.phone,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          ))}
        </section>
      )}

      {activities.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Things to do</h2>
          <ul className="flex flex-col gap-1.5">
            {activities.map((item, i) => (
              <li key={`${item.id}-${i}`} className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{item.title}</span>
                {item.subtitle && (
                  <span className="shrink-0 text-xs font-medium text-muted">{item.subtitle}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-1.5 border-t border-hairline pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Costs</h2>
        {flightTotal > 0 && (
          <div className="flex justify-between text-sm font-medium">
            <span>
              Flights · {trip.meta.travelers} traveler{trip.meta.travelers === 1 ? '' : 's'}
            </span>
            <span>{formatMoney(flightTotal)}</span>
          </div>
        )}
        {stayTotal > 0 && (
          <div className="flex justify-between text-sm font-medium">
            <span>Accommodation</span>
            <span>{formatMoney(stayTotal)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-hairline pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatMoney(flightTotal + stayTotal)}</span>
        </div>
        <p className="mt-1 text-[11px] font-medium text-muted">
          Prices are as of search. Bookings are completed on each provider&apos;s own site; Triperco
          is not affiliated with any of them.
        </p>
      </section>
    </div>
  )
}
