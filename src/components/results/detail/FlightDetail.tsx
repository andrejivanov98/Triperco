import type { Flight } from '@/lib/trip/types'
import { formatMoney, formatDuration, formatStops, formatCarbon } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { DetailSection, FactGrid } from './DetailPrimitives'

function LayoverRow({ label }: { label: string }) {
  return (
    <div className="my-1 flex items-center gap-2 pl-[7px]">
      <span className="h-6 w-px bg-hairline" />
      <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-muted">
        {label}
      </span>
    </div>
  )
}

export function FlightDetail({ flight }: { flight: Flight }) {
  const segments = flight.segments ?? []
  const layovers = flight.layovers ?? []

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Heading level={2} className="text-2xl">
          {flight.from} → {flight.to}
        </Heading>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
          {flight.airline && <span>{flight.airline}</span>}
          <span>·</span>
          <span>{formatStops(flight.stops, layovers.map((l) => l.code))}</span>
          {formatDuration(flight.durationMinutes) && (
            <>
              <span>·</span>
              <span>{formatDuration(flight.durationMinutes)} total</span>
            </>
          )}
        </div>
      </div>

      <FactGrid
        facts={[
          { label: 'Price', value: `${formatMoney(flight.price)} per traveler` },
          { label: 'Departs', value: [flight.departDate, flight.departTime].filter(Boolean).join(' · ') },
          { label: 'Arrives', value: [flight.arriveDate, flight.arriveTime].filter(Boolean).join(' · ') },
          {
            label: 'Cabin',
            value: segments.find((s) => s.cabin)?.cabin,
          },
          {
            label: 'Emissions',
            value: formatCarbon(flight.carbonGrams),
            note:
              flight.carbonVsTypical !== undefined
                ? `${flight.carbonVsTypical > 0 ? '+' : ''}${flight.carbonVsTypical}% vs typical`
                : undefined,
          },
        ]}
      />

      {segments.length > 0 && (
        <DetailSection title="Your route">
          <div className="flex flex-col">
            {segments.map((s, i) => {
              const layover = layovers[i]
              return (
                <div key={i} className="flex flex-col">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center pt-1.5">
                      <span className="h-2 w-2 rounded-full border-2 border-accent bg-white" />
                      <span className="min-h-10 w-px flex-1 bg-hairline" />
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="text-sm font-semibold text-ink">
                          {s.departTime} {s.fromName ?? s.fromCode} ({s.fromCode})
                        </div>
                        {formatDuration(s.durationMinutes) && (
                          <div className="text-xs font-medium text-muted">
                            {formatDuration(s.durationMinutes)}
                          </div>
                        )}
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-ink">
                        {s.arriveTime} {s.toName ?? s.toCode} ({s.toCode})
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs font-medium text-muted">
                        {[s.airline, s.flightNumber, s.aircraft, s.cabin, s.legroom]
                          .filter(Boolean)
                          .map((f, j) => (
                            <span key={j}>{f}</span>
                          ))}
                      </div>
                      {s.extensions && s.extensions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.extensions.map((e) => (
                            <span
                              key={e}
                              className="rounded-full border border-hairline bg-white/60 px-2 py-0.5 text-[11px] font-medium text-muted"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {layover && (
                    <LayoverRow
                      label={`${formatDuration(layover.durationMinutes) ?? 'Layover'} in ${
                        layover.name ?? layover.code ?? 'transit'
                      }${layover.overnight ? ' · overnight' : ''}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </DetailSection>
      )}

      {flight.extensions && flight.extensions.length > 0 && (
        <DetailSection title="Good to know">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm font-medium text-ink">
            {flight.extensions.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </DetailSection>
      )}
    </div>
  )
}
