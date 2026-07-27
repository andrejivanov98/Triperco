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
  open_state?: string
  operating_hours?: Record<string, string>
  phone?: string
  website?: string
  description?: string
  service_options?: Record<string, boolean>
}

export interface RawMapsResponse {
  local_results?: RawLocalResult[]
}

function priceLevel(price?: string): number | undefined {
  if (!price) return undefined
  const dollars = (price.match(/\$/g) ?? []).length
  return dollars > 0 ? dollars : undefined
}

/** "Open ⋅ Closes 6 PM" → true; "Closed ⋅ Opens 9 AM" → false; anything else → undefined. */
function openNow(state?: string): boolean | undefined {
  if (!state) return undefined
  const first = state.trim().toLowerCase()
  if (first.startsWith('open')) return true
  if (first.startsWith('closed') || first.startsWith('temporarily closed')) return false
  return undefined
}

function titleCase(key: string): string {
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function hoursByDay(raw?: Record<string, string>): { day: string; hours: string }[] | undefined {
  if (!raw) return undefined
  const entries = Object.entries(raw).map(([day, hours]) => ({ day: titleCase(day), hours }))
  return entries.length ? entries : undefined
}

/** `{ dine_in: true, delivery: false }` → `['Dine in']`. */
function serviceOptions(raw?: Record<string, boolean>): string[] | undefined {
  if (!raw) return undefined
  const on = Object.entries(raw)
    .filter(([, enabled]) => enabled)
    .map(([key]) => titleCase(key))
  return on.length ? on : undefined
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
      category: r.type ?? r.types?.[0],
      types: r.types,
      rating: r.rating,
      reviewCount: r.reviews,
      priceLevel: priceLevel(r.price),
      priceRange: r.price,
      photos,
      reviewSnippets: [],
      hours: r.hours ?? r.open_state,
      hoursByDay: hoursByDay(r.operating_hours),
      openNow: openNow(r.open_state),
      address: r.address,
      phone: r.phone,
      website: r.website,
      description: r.description,
      serviceOptions: serviceOptions(r.service_options),
      sourceLinks: {
        maps: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
      },
    }
  })
}
