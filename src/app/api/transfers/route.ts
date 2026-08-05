import { getTransferOptions } from '@/lib/searchapi/search'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'

export const maxDuration = 20

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
}

/**
 * Bounded rather than truncated: the key is how the caller matches an answer back to its journey, so
 * a shortened one would come back unrecognisable. A real key is a couple of ids joined by colons.
 */
function usable(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PLACE_CHARS
}

function readLegs(value: unknown): Leg[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((leg): leg is Leg => {
      if (typeof leg !== 'object' || leg === null) return false
      const { key, from, to } = leg as Record<string, unknown>
      return usable(key) && usable(from) && usable(to)
    })
    .slice(0, MAX_LEGS)
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
      const options = await getTransferOptions(leg.from, leg.to, undefined).catch(() => [])
      return [leg.key, options] as const
    }),
  )

  return Response.json({ legs: Object.fromEntries(entries) })
}
