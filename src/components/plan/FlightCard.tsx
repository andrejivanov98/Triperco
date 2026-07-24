import type { Flight } from '@/lib/trip/types'
import { formatMoney } from '@/lib/ui/format'

export function FlightCard({ flight }: { flight: Flight }) {
  const stopsLabel =
    flight.stops === 0 ? 'nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`
  const times = flight.departTime
    ? `${flight.departTime}${flight.arriveTime ? `–${flight.arriveTime}` : ''}`
    : undefined
  const meta = [flight.airline, times].filter(Boolean).join(' · ')

  return (
    <div className="glass flex items-center gap-3 p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-accent">Flight</div>
        <div className="truncate text-sm font-semibold text-ink">
          {flight.from} → {flight.to} · {stopsLabel}
        </div>
        {meta && <div className="truncate text-xs font-medium text-muted">{meta}</div>}
      </div>
      <a
        href={flight.bookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto shrink-0 text-sm font-bold text-accent"
      >
        {formatMoney(flight.price)} ↗
      </a>
    </div>
  )
}
