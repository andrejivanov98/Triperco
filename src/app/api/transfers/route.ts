import { findTransferRoute, MAX_TRANSFER_ATTEMPTS } from '@/lib/searchapi/search'
import { connectionCandidates } from '@/lib/trip/connections'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'

/**
 * A leg can take three provider calls before it gives up, and eight legs run at once. Twenty seconds
 * was cutting that off mid-flight, and an aborted request answers the same way a routeless journey
 * does — which is part of how the plan came to claim there was no way to get somewhere.
 */
export const maxDuration = 60

/** How many legs one request may price. A plan has a handful; this stops a crafted request. */
const MAX_LEGS = 8

/**
 * The longest place a leg may name. "Hotel Artemide, Via Nazionale 22, Rome" is comfortably inside
 * it, and a bounded value is what keeps a crafted request from writing an enormous cache key or
 * handing the directions engine a megabyte to parse.
 */
const MAX_PLACE_CHARS = 200

interface Leg {
  key: string
  from: string
  to: string
  /** Other ways of naming each end, tried in order when the first returns no route. */
  fromAlternates?: string[]
  toAlternates?: string[]
}

/**
 * Bounded rather than truncated: the key is how the caller matches an answer back to its journey, so
 * a shortened one would come back unrecognisable. A real key is a couple of ids joined by colons.
 */
function usable(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PLACE_CHARS
}

/** The alternate names for one end, bounded the same way as the primary. */
function readAlternates(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter(usable).slice(0, MAX_TRANSFER_ATTEMPTS)
}

function readLegs(value: unknown): Leg[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((leg): leg is Record<string, unknown> => typeof leg === 'object' && leg !== null)
    .filter((leg) => usable(leg.key) && usable(leg.from) && usable(leg.to))
    .slice(0, MAX_LEGS)
    .map((leg) => ({
      key: leg.key as string,
      from: leg.from as string,
      to: leg.to as string,
      fromAlternates: readAlternates(leg.fromAlternates),
      toAlternates: readAlternates(leg.toAlternates),
    }))
}

/**
 * How to get between the places in a plan. Cached upstream for a day.
 *
 * Batched by design: a plan's legs are wanted together, and one round trip beats six. A leg that
 * fails resolves to an empty list rather than failing the request — a plan showing five of six
 * journeys is far better than one showing none.
 */
export async function POST(req: Request) {
  const limit = await checkRateLimit(req, 'lookup')
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  let body: { legs?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Malformed request body.' }, { status: 400 })
  }

  const legs = readLegs(body.legs)
  if (legs.length === 0) {
    return Response.json({ error: 'legs must be a non-empty array of {key, from, to}.' }, { status: 400 })
  }

  const entries = await Promise.all(
    legs.map(async (leg) => {
      const route = await findTransferRoute(connectionCandidates(leg), undefined).catch(() => ({
        options: [],
        from: leg.from,
        to: leg.to,
      }))
      return [leg.key, route] as const
    }),
  )

  /*
   * The endpoints come back beside the times, and they are not decoration. The description that
   * finally routed is often a pair of coordinates rather than the name the plan shows — so this is
   * what lets the card's Directions link open the journey that worked instead of the name that did
   * not, terminal picker and all.
   */
  return Response.json({
    legs: Object.fromEntries(entries.map(([key, route]) => [key, route.options])),
    endpoints: Object.fromEntries(
      entries.map(([key, route]) => [key, { from: route.from, to: route.to }]),
    ),
  })
}
