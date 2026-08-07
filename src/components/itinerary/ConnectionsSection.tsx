'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { TripState } from '@/lib/trip/types'
import type { TransferOption } from '@/lib/searchapi/search'
import { planConnections, type Connection } from '@/lib/trip/connections'
import { Icon, type IconName } from '@/components/ui/Icon'

/** The provider names its modes in prose; each gets the glyph a traveler recognises. */
const MODE_ICONS: { pattern: RegExp; icon: IconName }[] = [
  { pattern: /driv|car|taxi/i, icon: 'car' },
  { pattern: /transit|bus|train|metro|subway/i, icon: 'transit' },
  { pattern: /walk/i, icon: 'walk' },
  { pattern: /cycl|bike/i, icon: 'bike' },
]

/**
 * How many journeys one request may carry. Matches the server's own cap.
 *
 * This used to be the client's blind spot: it asked about every leg in one request and recorded an
 * empty answer for each key it asked about, while the server priced the first eight and dropped the
 * rest. A plan with a stay and eight things to do therefore *always* reported "no route" for its
 * last few hops, whatever the provider would have said. They go in batches now, so nothing is
 * dropped and nothing is answered on a journey nobody looked up.
 */
const LEGS_PER_REQUEST = 8

/** Attempts at a batch before we stop asking. One retry: past that it is not a blip. */
const MAX_ATTEMPTS = 2

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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** What one request asks about a journey: the key it answers under, and how to name each end. */
function payload(connection: Connection) {
  return {
    key: connection.key,
    from: connection.from,
    to: connection.to,
    fromAlternates: connection.fromAlternates,
    toAlternates: connection.toAlternates,
  }
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
  /*
   * How many times each journey has been asked about. Held in a ref rather than in state because it
   * must not itself cause a render — and because the point of it is to stop the effect re-running
   * forever on a journey whose request keeps failing.
   */
  const attempts = useRef<Map<string, number>>(new Map())

  // Re-fetch only when the set of journeys genuinely changes, not on every plan edit.
  const wanted = connections.filter(
    (c) => legs[c.key] === undefined && (attempts.current.get(c.key) ?? 0) < MAX_ATTEMPTS,
  )
  const wantedKey = wanted.map((c) => c.key).join('|')

  useEffect(() => {
    if (wantedKey.length === 0) return
    const batch = wantedKey.split('|')
    const byKey = new Map(connections.map((c) => [c.key, c]))
    for (const key of batch) attempts.current.set(key, (attempts.current.get(key) ?? 0) + 1)

    let cancelled = false
    setLoading(true)
    void (async () => {
      /*
       * In batches the server will actually price, and each batch lands on its own. A slow last
       * group no longer holds up the journeys that already came back.
       */
      for (const group of chunk(batch, LEGS_PER_REQUEST)) {
        if (cancelled) return
        try {
          const res = await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              legs: group
                .map((key) => byKey.get(key))
                .filter((c): c is Connection => c !== undefined)
                .map(payload),
            }),
          })
          if (cancelled) return
          /*
           * A refused request — rate limited, or the route itself failing — says nothing about
           * whether these journeys have routes, so nothing is recorded. The attempt counter is what
           * stops that becoming an endless retry.
           */
          if (!res.ok) continue
          const { legs: found } = (await res.json()) as { legs?: Record<string, TransferOption[]> }
          if (cancelled) return
          // Record every key in this group, so a genuinely empty answer is not retried forever.
          setLegs((current) => ({
            ...current,
            ...Object.fromEntries(group.map((key) => [key, found?.[key] ?? []])),
          }))
        } catch {
          // Same reasoning: a dropped request is not an answer about the journey.
        }
      }
      if (!cancelled) setLoading(false)
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
          // Asked about, not still in flight, and no answer came back: the request itself failed.
          const unanswered =
            options === undefined && !loading && (attempts.current.get(connection.key) ?? 0) > 0
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
                /*
                 * Two different things, said differently. "We asked and got nothing" is not the same
                 * as "we could not ask", and telling someone there is no route when we never found
                 * out is exactly the claim that sent them to Maps to prove us wrong.
                 */
                (options !== undefined || unanswered) && (
                  <p className="mt-1.5 text-[11px] font-medium text-muted">
                    {unanswered
                      ? 'I could not check this one — open Directions for it.'
                      : 'No times came back for this one — open Directions to check it.'}
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
