import type { Stay } from '../trip/types'

interface RawProperty {
  name: string
  type?: string
  price_per_night?: { extracted_price?: number }
  rating?: number
  reviews?: number
  gps_coordinates?: { latitude: number; longitude: number }
  images?: { thumbnail?: string; original?: string }[]
  link?: string
}

export interface RawHotelsResponse {
  properties?: RawProperty[]
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function normalizeHotels(raw: RawHotelsResponse, nights: number): Stay[] {
  return (raw.properties ?? []).map((p, i) => ({
    id: `${slugify(p.name)}-${i}`,
    name: p.name,
    source: 'hotel' as const,
    coords: p.gps_coordinates
      ? { lat: p.gps_coordinates.latitude, lng: p.gps_coordinates.longitude }
      : undefined,
    rating: p.rating,
    reviewCount: p.reviews,
    pricePerNight: p.price_per_night?.extracted_price ?? 0,
    nights,
    photos: (p.images ?? []).map((img) => img.original ?? img.thumbnail ?? '').filter(Boolean),
    bookUrl: p.link ?? '',
  }))
}
