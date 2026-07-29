import type { Flight } from '@/lib/trip/types'
import { formatDuration } from '@/lib/ui/format'
import { Icon } from '@/components/ui/Icon'

/** "1h 35" style, for the small label sitting on the connector line. */
function legDuration(minutes?: number): string | undefined {
  if (minutes === undefined) return undefined
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${m}m`
}

/**
 * The full journey, hop by hop: each airport with its time, the flying time between them, and the
 * layover called out in its own right.
 *
 * A single "1 stop · 4h 30" line hides the thing people actually decide on — where they are stuck,
 * for how long, and on what aircraft.
 */
export function FlightSegments({ flight }: { flight: Flight }) {
  const segments = flight.segments ?? []
  if (segments.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {segments.map((segment, i) => {
        const layover = flight.layovers?.[i]
        const facts = [segment.aircraft, segment.cabin, segment.legroom].filter(Boolean) as string[]

        return (
          <div key={`${segment.fromCode}-${segment.toCode}-${i}`} className="flex flex-col gap-2">
            <div className="flex gap-3">
              {/* The rail: dot, line, dot. */}
              <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
                <span className="h-2 w-2 rounded-full border-2 border-deep bg-white" />
                <span className="my-1 w-px flex-1 bg-hairline" />
                <span className="h-2 w-2 rounded-full border-2 border-deep bg-white" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-bold text-ink">
                    {segment.fromName ?? segment.fromCode}
                    {segment.fromName && <span className="text-muted"> ({segment.fromCode})</span>}
                  </span>
                  <span className="text-[11px] font-semibold text-muted">
                    {segment.departTime} {segment.departDate && `· ${segment.departDate}`}
                  </span>
                </div>

                <span className="flex items-center gap-1.5 py-0.5 text-[11px] font-semibold text-muted">
                  <Icon name="plane" className="h-3 w-3" />
                  {legDuration(segment.durationMinutes) ?? '—'}
                </span>

                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-bold text-ink">
                    {segment.toName ?? segment.toCode}
                    {segment.toName && <span className="text-muted"> ({segment.toCode})</span>}
                  </span>
                  <span className="text-[11px] font-semibold text-muted">
                    {segment.arriveTime} {segment.arriveDate && `· ${segment.arriveDate}`}
                  </span>
                </div>
              </div>
            </div>

            {(segment.airline || facts.length > 0) && (
              <div className="ml-6 flex flex-wrap items-center gap-1.5">
                {segment.airline && (
                  <span className="text-[11px] font-semibold text-muted">
                    {segment.airline}
                    {segment.flightNumber ? ` ${segment.flightNumber}` : ''}
                  </span>
                )}
                {facts.map((fact) => (
                  <span
                    key={fact}
                    className="rounded-full border border-hairline bg-white px-2 py-0.5 text-[10px] font-semibold text-muted"
                  >
                    {fact}
                  </span>
                ))}
              </div>
            )}

            {layover && (
              <div className="ml-6 text-[11px] font-bold text-amber-700">
                {formatDuration(layover.durationMinutes) ?? ''} layover in{' '}
                {layover.name ?? layover.code}
                {layover.overnight ? ' · overnight' : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
