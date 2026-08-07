import type { Place } from '../trip/types'
import { photoUrl } from './normalizePhotos'

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
  /**
   * Urls on a search result; `{ title, thumbnail }` category tiles on a single-place result such as
   * a city. Both shapes are real, so both are read.
   */
  images?: (string | { title?: string; image?: string; thumbnail?: string })[]
  hours?: string
  open_state?: string
  open_hours?: Record<string, string>
  phone?: string
  website?: string
  description?: string
  review_text?: string
  /** Grouped feature lists, e.g. { title: 'Service options', items: [{ title: 'Delivery' }] }. */
  extensions?: { title?: string; items?: { title?: string; value?: string }[] }[]
}

export interface RawMapsResponse {
  local_results?: RawLocalResult[]
}

function priceLevel(price?: string): number | undefined {
  if (!price) return undefined
  const dollars = (price.match(/\$/g) ?? []).length
  return dollars > 0 ? dollars : undefined
}

/** "Open" / "Open ⋅ Closes 6 PM" → true; "Closed …" → false; anything else → undefined. */
function openNow(state?: string): boolean | undefined {
  if (!state) return undefined
  const first = state.trim().toLowerCase()
  if (first.startsWith('open')) return true
  if (first.startsWith('closed') || first.includes('closed')) return false
  return undefined
}

/**
 * Shut for good, as opposed to shut right now. A bar that closes at 2am is still worth planning
 * around; one that has closed down is not.
 */
function permanentlyClosed(state?: string): boolean | undefined {
  if (!state) return undefined
  const text = state.toLowerCase()
  return text.includes('permanently closed') || text.includes('temporarily closed') ? true : undefined
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

/** Flatten the provider's grouped feature lists into one list of item titles. */
function serviceOptions(raw?: RawLocalResult['extensions']): string[] | undefined {
  const items = (raw ?? [])
    .flatMap((group) => group.items ?? [])
    .map((item) => item.title)
    .filter((t): t is string => Boolean(t))
  return items.length ? items : undefined
}

export function normalizePlaces(raw: RawMapsResponse): Place[] {
  return (raw.local_results ?? []).map((r) => {
    /*
     * Every photo the provider gave us. Before this only the thumbnail survived and `images` was
     * discarded, so a place with a dozen photos arrived with one and the card had nothing to show.
     *
     * The gallery images lead and the search thumbnail comes last: a thumbnail is an 86px crop, and
     * putting it first made it the card's cover — a blurred smear where the photo should be.
     *
     * Read through `photoUrl` because the field is not always a url. A city result carries photo
     * *categories* as objects, and treating one as a string threw — which failed the whole search,
     * not just its photos, and is why a plan could end up with no cover image.
     */
    const photos = [
      ...new Set([...(r.images ?? []), r.thumbnail].map(photoUrl).filter(Boolean)),
    ]
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
      // The search result carries at most one quote; the reviews engine fills the rest on demand.
      reviewSnippets: r.review_text ? [{ text: r.review_text }] : [],
      hours: r.hours ?? r.open_state,
      hoursByDay: hoursByDay(r.open_hours),
      openNow: openNow(r.open_state),
      permanentlyClosed: permanentlyClosed(r.open_state),
      address: r.address,
      phone: r.phone,
      website: r.website,
      description: r.description,
      serviceOptions: serviceOptions(r.extensions),
      sourceLinks: {
        maps: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
      },
    }
  })
}
