import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting for the public API routes.
 *
 * Nothing here needs an account, which is deliberate — but it means one script can spend the
 * project's model tokens and search quota without ever being asked who it is. A single planning
 * turn can fan out to five provider calls, so the cost of an unbounded endpoint is real money
 * rather than just load.
 *
 * The limits are set to sit far above what a person doing genuine planning will hit, and far below
 * what a loop will reach in seconds.
 */

/** The same credential discovery the trip store uses; Vercel and Upstash disagree on the names. */
function redisCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

export type LimitName = 'chat' | 'lookup' | 'share'

/** Requests per window, chosen against what a real session looks like. */
const LIMITS: Record<LimitName, { tokens: number; window: `${number} ${'s' | 'm' | 'h'}` }> = {
  // A thorough planning session runs maybe 20 turns; each one can cost several provider calls.
  chat: { tokens: 30, window: '10 m' },
  // Opening details is cheap and clicky — people browse fast, so this is deliberately loose.
  lookup: { tokens: 120, window: '10 m' },
  // Saving a shared trip writes to Redis; nobody legitimately does this in bulk.
  share: { tokens: 20, window: '10 m' },
}

const limiters = new Map<LimitName, Ratelimit>()

function limiterFor(name: LimitName): Ratelimit | null {
  const credentials = redisCredentials()
  if (!credentials) return null

  const existing = limiters.get(name)
  if (existing) return existing

  const { tokens, window } = LIMITS[name]
  const limiter = new Ratelimit({
    redis: new Redis(credentials),
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `rl:${name}`,
    analytics: false,
  })
  limiters.set(name, limiter)
  return limiter
}

/**
 * Who is asking. Vercel puts the real client first in x-forwarded-for; everything after it is
 * proxy hops. Falls back to a shared bucket rather than to "unlimited", so a request we cannot
 * identify still cannot run free.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first || request.headers.get('x-real-ip') || 'unknown'
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the caller may retry. Only meaningful when ok is false. */
  retryAfter: number
  remaining: number
}

/**
 * Check the limit for this caller.
 *
 * Fails **open**: without Redis configured, or if Redis itself is unreachable, the request is
 * allowed. A rate limiter that takes the whole site down when its backing store hiccups is worse
 * than the abuse it prevents.
 */
export async function checkRateLimit(
  request: Request,
  name: LimitName,
): Promise<RateLimitResult> {
  const limiter = limiterFor(name)
  if (!limiter) return { ok: true, retryAfter: 0, remaining: LIMITS[name].tokens }

  try {
    const { success, reset, remaining } = await limiter.limit(clientKey(request))
    return {
      ok: success,
      retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
      remaining,
    }
  } catch {
    return { ok: true, retryAfter: 0, remaining: LIMITS[name].tokens }
  }
}

/** The response to send when someone is over the limit. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Give it a minute and try again.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(retryAfter),
      },
    },
  )
}
