import type { TripState } from '@/lib/trip/types'
import { formatMoney } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { FlightCard } from './FlightCard'
import { StayCard } from './StayCard'
import { DayCard } from './DayCard'

export function PlanView({ trip }: { trip: TripState }) {
  const isEmpty =
    trip.flights.length === 0 && trip.stays.length === 0 && trip.days.length === 0

  return (
    <div className="flex h-full flex-col gap-2">
      {trip.meta.destination && (
        <Heading level={2} className="px-1 text-lg">
          {trip.meta.destination}
        </Heading>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {trip.flights.map((f) => (
          <FlightCard key={f.id} flight={f} />
        ))}
        {trip.stays.map((s) => (
          <StayCard key={s.id} stay={s} />
        ))}
        {trip.days.map((d, i) => (
          <DayCard key={i} day={d} index={i} />
        ))}
        {isEmpty && (
          <p className="mt-6 text-center text-sm font-medium text-muted">
            Your plan will appear here as we build it together.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-accent/30 bg-accent-050 px-4 py-3 text-sm font-bold text-ink">
        <span>Estimated total</span>
        <span>{formatMoney(trip.estimatedTotal)}</span>
      </div>
    </div>
  )
}
