import { getPlaceReviews, getPlacePhotos } from '@/lib/searchapi/search'

export const maxDuration = 20

/** On-demand reviews + photos for the place detail panel. Cached upstream. */
export async function POST(req: Request) {
  const { placeId }: { placeId?: string } = await req.json()
  if (!placeId) return Response.json({ error: 'placeId is required' }, { status: 400 })
  try {
    const [reviews, photos] = await Promise.all([
      getPlaceReviews(placeId, undefined),
      getPlacePhotos(placeId, undefined),
    ])
    return Response.json({ reviews, photos })
  } catch {
    return Response.json({ reviews: [], photos: [] })
  }
}
