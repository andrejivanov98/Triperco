import { getPlaceReviews, getPlacePhotos } from '@/lib/searchapi/search'
import type { ReviewSnippet } from '@/lib/trip/types'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'

export const maxDuration = 20

/** One place's extra detail, as the detail panel and the carousel both want it. */
interface PlaceDetail {
  reviews: ReviewSnippet[]
  photos: string[]
}

/**
 * How many places one request may ask about. Each costs two provider calls, so this cap is what
 * stops a crafted request turning one round trip into a hundred.
 */
const MAX_BATCH = 6

async function detailFor(placeId: string): Promise<PlaceDetail> {
  const [reviews, photos] = await Promise.all([
    getPlaceReviews(placeId, undefined).catch(() => [] as ReviewSnippet[]),
    getPlacePhotos(placeId, undefined).catch(() => [] as string[]),
  ])
  return { reviews, photos }
}

/**
 * On-demand reviews + photos for places. Cached upstream for a day.
 *
 * Two shapes, because two callers want different things: `placeId` answers for the open detail
 * panel, and `placeIds` fills in a carousel's remaining cards in one round trip instead of six.
 */
export async function POST(req: Request) {
  const limit = await checkRateLimit(req, 'lookup')
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  let body: { placeId?: unknown; placeIds?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Malformed request body.' }, { status: 400 })
  }

  // Batch form: keyed by id, so the caller can match each answer back to its card.
  if (Array.isArray(body.placeIds)) {
    const ids = [
      ...new Set(body.placeIds.filter((id): id is string => typeof id === 'string' && id.length > 0)),
    ].slice(0, MAX_BATCH)
    const entries = await Promise.all(ids.map(async (id) => [id, await detailFor(id)] as const))
    return Response.json({ places: Object.fromEntries(entries) })
  }

  if (typeof body.placeId !== 'string' || body.placeId.length === 0) {
    return Response.json({ error: 'placeId or placeIds is required' }, { status: 400 })
  }
  // Single form, unchanged for the detail panel: reviews and photos at the top level.
  return Response.json(await detailFor(body.placeId))
}
