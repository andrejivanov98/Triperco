'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TripState } from '@/lib/trip/types'
import type { TransferOption } from '@/lib/searchapi/search'
import { planConnections } from '@/lib/trip/connections'
import { Icon, type IconName } from '@/components/ui/Icon'

/** The provider names its modes in prose; each gets the glyph a traveler recognises. */
const MODE_ICONS: { pattern: RegExp; icon: IconName }[] = [
  { pattern: /driv|car|taxi/i, icon: 'car' },
  { pattern: /transit|bus|train|metro|subway/i, icon: 'transit' },
  { pattern: /walk/i, icon: 'walk' },
  { pattern: /cycl|bike/i, icon: 'bike' },
]

function modeIcon(mode: string): IconName {
  return MODE_ICONS.find(({ pattern }) => pattern.test(mode))?.icon ?? 'route'
}

/** The fastest option first — that is the number people actually plan around. */
function bestFirst(options: TransferOption[]): TransferOption[] {
  return [...options]
    .sort((a, b) => (a.durationSeconds ?? Infinity) - (b.durationSeconds ?? Infinity))
    .slice(0, 4)
}

function mapsUrl(from: string, to: string): string {
  const params = new URLSearchParams({ api: '1', origin: from, destination: to })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * How the traveler gets between the places they chose.
 *
 * The plan used to be a list of destinations with silent gaps between them, which is where trips
 * actually come apart: the cheap apartment that turns out to be two changes from everything. Every
 * duration here comes from the directions engine — nothing is estimated.
 */
export function ConnectionsSection({ trip }: { trip: TripState }) {
  const connections = useMemo(() => planConnections(trip), [trip])
  const [legs, setLegs] = useState<Record<string, TransferOption[]>>({})
  const [loading, setLoading] = useState(false)

  // Re-fetch only when the set of journeys genuinely changes, not on every plan edit.
  const wanted = connections.filter((c) => legs[c.key] === undefined)
  const wantedKey = wanted.map((c) => c.key).join('|')

  useEffect(() => {
    if (wantedKey.length === 0) return
    const batch = wantedKey.split('|')
    const byKey = new Map(connections.map((c) => [c.key, c]))
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const res = await fetch('/api/transfers', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            legs: batch
              .map((key) => byKey.get(key))
              .filter((c): c is NonNullable<typeof c> => c !== undefined)
              .map(({ key, from, to }) => ({ key, from, to })),
          }),
        })
        if (!res.ok || cancelled) return
        const { legs: found } = (await res.json()) as { legs?: Record<string, TransferOption[]> }
        // Record every key we asked about, so an empty answer is not retried forever.
        if (!cancelled) {
          setLegs((current) => ({
            ...current,
            ...Object.fromEntries(batch.map((key) => [key, found?.[key] ?? []])),
          }))
        }
      } catch {
        if (!cancelled) {
          setLegs((current) => ({ ...current, ...Object.fromEntries(batch.map((k) => [k, []])) }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the journeys, not the array identity
  }, [wantedKey])

  if (connections.length === 0) return null

  return (
    <section data-testid="connections" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon name="route" className="h-4 w-4 text-muted" />
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Getting around</h3>
        {loading && (
          <span role="status" className="text-[11px] font-semibold text-muted">
            checking…
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {connections.map((connection) => {
          const options = legs[connection.key]
          const best = options ? bestFirst(options) : []
          return (
            <div
              key={connection.key}
              data-testid="connection"
              className="rounded-xl border border-hairline bg-white/50 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-bold text-ink">{connection.label}</span>
                <a
                  href={mapsUrl(connection.from, connection.to)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-accent-600 hover:text-accent"
                >
                  Directions
                  <Icon name="arrow-up-right" className="h-3 w-3" />
                </a>
              </div>

              {best.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {best.map((option) => (
                    <span
                      key={option.mode}
                      className="flex items-center gap-1.5 rounded-full border border-hairline bg-white px-2.5 py-1 text-[11px] font-semibold text-ink"
                    >
                      <Icon name={modeIcon(option.mode)} className="h-3.5 w-3.5 text-muted" />
                      {option.duration ?? option.mode}
                      {option.distance && (
                        <span className="font-medium text-muted">· {option.distance}</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                options !== undefined && (
                  // Said plainly rather than guessed. An invented duration is worse than none.
                  <p className="mt-1.5 text-[11px] font-medium text-muted">
                    No route came back for this one — open Directions to check it.
                  </p>
                )
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
