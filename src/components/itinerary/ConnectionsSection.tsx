'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { TripState } from '@/lib/trip/types'
import type { TransferOption } from '@/lib/searchapi/search'
import { planConnections, type Connection } from '@/lib/trip/connections'
import { journeyUrl, type TravelMode } from '@/lib/trip/mapsLink'
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

/**
 * The modes offered on a journey that came back with no times, in the order a traveler would try
 * them. Each opens Maps with the mode already selected, so the picking we could not do for them is
 * one tap rather than four.
 */
const FALLBACK_MODES: { mode: TravelMode; label: string; icon: IconName }[] = [
  { mode: 'driving', label: 'Drive', icon: 'car' },
  { mode: 'transit', label: 'Transit', icon: 'transit' },
  { mode: 'walking', label: 'Walk', icon: 'walk' },
]

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
  /*
   * How each journey was finally named, as the server resolved it. Usually a pair of coordinates:
   * that is what routes when a name will not, and it is what the Directions link must carry so the
   * traveler lands on the journey rather than on "which terminal did you mean?".
   */
  const [ends, setEnds] = useState<Record<string, { from: string; to: string }>>({})
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
          const { legs: found, endpoints } = (await res.json()) as {
            legs?: Record<string, TransferOption[]>
            endpoints?: Record<string, { from: string; to: string }>
          }
          if (cancelled) return
          // Record every key in this group, so a genuinely empty answer is not retried forever.
          setLegs((current) => ({
            ...current,
            ...Object.fromEntries(group.map((key) => [key, found?.[key] ?? []])),
          }))
          if (endpoints) setEnds((current) => ({ ...current, ...endpoints }))
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
          // Whatever finally routed, falling back to the plan's own names before anything came back.
          const routed = ends[connection.key] ?? { from: connection.from, to: connection.to }
          return (
            <div
              key={connection.key}
              data-testid="connection"
              className="rounded-xl border border-hairline bg-white/50 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-bold text-ink">{connection.label}</span>
                <a
                  href={journeyUrl(routed.from, routed.to)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 py-1 text-[11px] font-bold text-accent-600 hover:text-accent"
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
                 *
                 * Either way, the way out is the same one they were taking by hand: open Maps. So the
                 * modes are offered here as links, each already carrying its own travelmode — the
                 * arrivals-or-departures, which-terminal, which-mode sequence collapsed into one tap.
                 */
                (options !== undefined || unanswered) && (
                  <div className="mt-1.5 flex flex-col gap-2">
                    <p className="text-[11px] font-medium text-muted">
                      {unanswered
                        ? 'I could not check this one — open it in Maps:'
                        : 'No times came back for this one — open it in Maps:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {FALLBACK_MODES.map(({ mode, label, icon }) => {
                        const href = journeyUrl(routed.from, routed.to, mode)
                        if (!href) return null
                        return (
                          <a
                            key={mode}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-9 items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-[11px] font-bold text-ink transition active:scale-[0.97] hover:border-accent/40 hover:text-accent-600"
                          >
                            <Icon name={icon} className="h-3.5 w-3.5 text-muted" />
                            {label}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
