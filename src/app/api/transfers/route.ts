import { getTransferOptions } from '@/lib/searchapi/search'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'

export const maxDuration = 20

/** How many legs one request may price. A plan has a handful; this stops a crafted request. */
const MAX_LEGS = 8

interface Leg {
  key: string
  from: string
  to: string
}

function readLegs(value: unknown): Leg[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((leg): leg is Leg => {
      if (typeof leg !== 'object' || leg === null) return false
      const { key, from, to } = leg as Record<string, unknown>
      return [key, from, to].every((v) => typeof v === 'string' && v.length > 0)
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
