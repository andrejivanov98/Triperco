import { getTripStore } from '@/lib/share/tripStore'
import { newTripId } from '@/lib/share/share'
import type { TripState } from '@/lib/trip/types'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'

// Save a trip and return its shareable id. Always mints a fresh id so sharing
// never overwrites an existing shared trip.
export async function POST(req: Request) {
  const limit = await checkRateLimit(req, 'share')
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  const { trip }: { trip: TripState } = await req.json()
  const id = newTripId()
  await getTripStore().save({ ...trip, id })
  return Response.json({ id })
}
