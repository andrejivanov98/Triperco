import type { Place } from '../trip/types'

interface RawLocalResult {
  title: string
  place_id: string
  data_id?: string
  address?: string
  rating?: number
  reviews?: number
  price?: string
  type?: string
  types?: string[]
  gps_coordinates?: { latitude: number; longitude: number }
  thumbnail?: string
  images?: string[]
  hours?: string
}

export interface RawMapsResponse {
  local_results?: RawLocalResult[]
}

function priceLevel(price?: string): number | undefined {
  if (!price) return undefined
  const dollars = (price.match(/\$/g) ?? []).length
  return dollars > 0 ? dollars : undefined
}

export function normalizePlaces(raw: RawMapsResponse): Place[] {
  return (raw.local_results ?? []).map((r) => {
    const photos: string[] = []
    if (r.thumbnail) photos.push(r.thumbnail)
    else if (r.images?.length) photos.push(...r.images)
    return {
      id: r.place_id,
      name: r.title,
      coords: r.gps_coordinates
        ? { lat: r.gps_coordinates.latitude, lng: r.gps_coordinates.longitude }
        : undefined,
      category: r.type,
      rating: r.rating,
      reviewCount: r.reviews,
      priceLevel: priceLevel(r.price),
      photos,
      reviewSnippets: [],
      hours: r.hours,
      address: r.address,
      sourceLinks: {
        maps: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
      },
    }
  })
}
