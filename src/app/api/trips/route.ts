import { getTripStore } from '@/lib/share/tripStore'
import { newTripId, newWriteToken } from '@/lib/share/share'
import type { TripState } from '@/lib/trip/types'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'

/**
 * Constant-time comparison, so a wrong token cannot be narrowed down by timing how long the
 * comparison took. Overkill for a share link, and still the right way to compare a secret.
 */
/**
 * How large a saved plan may be. A full trip — flights, stays, a week of activities, every photo url
 * — runs to a few tens of kilobytes, so this is generous for a plan somebody actually made and small
 * enough that nobody can use the share endpoint as free storage.
 */
const MAX_TRIP_CHARS = 256_000

function tokenMatches(given: string, stored: string): boolean {
  if (given.length !== stored.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ stored.charCodeAt(i)
  return diff === 0
}

/**
 * Save a trip and return its shareable id.
 *
 * One trip keeps one link: pass back the `id` and `token` from a previous save and that same id is
 * updated in place, so a link already sent to somebody keeps working and shows the current plan.
 *
 * The token is what makes that safe. An id is known to everyone holding the link, so it cannot also
 * be the proof of who may overwrite what is behind it — without a matching token a save always mints
 * a fresh id rather than touching an existing trip. Whoever opens a shared link has the id but never
 * the token, so they can copy the trip and share their own version, and can never alter the original.
 */
export async function POST(req: Request) {
  const limit = await checkRateLimit(req, 'share')
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  let body: { trip?: TripState; id?: unknown; token?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Malformed request body.' }, { status: 400 })
  }

  const trip = body.trip
  if (!trip || typeof trip !== 'object' || !Array.isArray(trip.flights)) {
    return Response.json({ error: 'trip is required.' }, { status: 400 })
  }
  if (JSON.stringify(trip).length > MAX_TRIP_CHARS) {
    return Response.json({ error: 'That trip is too large to share.' }, { status: 413 })
  }

  const store = getTripStore()
  const givenId = typeof body.id === 'string' ? body.id : undefined
  const givenToken = typeof body.token === 'string' ? body.token : undefined

  if (givenId && givenToken) {
    const stored = await store.getToken(givenId)
    if (stored && tokenMatches(givenToken, stored)) {
      await store.save({ ...trip, id: givenId })
      return Response.json({ id: givenId, token: givenToken })
    }
    // Falls through deliberately: a wrong or expired token gets a new trip, never someone else's.
  }

  const id = newTripId()
  const token = newWriteToken()
  await store.putToken(id, token)
  await store.save({ ...trip, id })
  return Response.json({ id, token })
}
