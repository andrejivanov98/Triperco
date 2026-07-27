import type { Flight, Stay, Place, ReviewSnippet } from '../trip/types'
import { searchApi, type SearchApiOptions, type SearchParams } from './client'
import { createInMemoryCache, withCache, type Cache } from './cache'
import { normalizeFlights, type RawFlightsResponse } from './normalizeFlights'
import { normalizeHotels, type RawHotelsResponse } from './normalizeHotels'
import { normalizeHotelProperty, type RawPropertyResponse } from './normalizeHotelProperty'
import { normalizePlaces, type RawMapsResponse } from './normalizePlaces'
import { normalizeReviews, type RawReviewsResponse } from './normalizeReviews'
import { normalizePhotos, type RawPhotosResponse } from './normalizePhotos'

export type SearchFn = <T>(engine: string, params: SearchParams) => Promise<T>

export interface SearchDeps {
  search?: SearchFn
  cache?: Cache
  clientOptions?: SearchApiOptions
}

export const TTL = {
  flights: 900, // 15 min
  hotels: 900,
  places: 86_400, // 24 h
  reviews: 86_400,
  photos: 86_400,
} as const

// Module-level default cache so real usage shares one cache across calls.
const defaultCache = createInMemoryCache()

function resolve(deps?: SearchDeps): { search: SearchFn; cache: Cache } {
  const cache = deps?.cache ?? defaultCache
  const search =
    deps?.search ??
    (<T>(engine: string, params: SearchParams) =>
      searchApi<T>(engine, params, deps?.clientOptions))
  return { search, cache }
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

export interface FlightParams {
  departure_id: string
  arrival_id: string
  outbound_date: string
  /** Required by the provider for round trips. */
  return_date?: string
  flight_type?: 'one_way' | 'round_trip'
}

export async function searchFlights(params: FlightParams, deps?: SearchDeps): Promise<Flight[]> {
  const { search, cache } = resolve(deps)
  // The provider rejects a round trip with no return date, so treat that as a one-way search.
  const type = params.flight_type === 'round_trip' && params.return_date ? 'round_trip' : 'one_way'
  const returnDate = type === 'round_trip' ? params.return_date : undefined
  const key = `google_flights:${params.departure_id}:${params.arrival_id}:${params.outbound_date}:${returnDate ?? ''}:${type}`
  return withCache(cache, key, TTL.flights, async () => {
    const raw = await search<RawFlightsResponse>('google_flights', {
      departure_id: params.departure_id,
      arrival_id: params.arrival_id,
      outbound_date: params.outbound_date,
      return_date: returnDate,
      flight_type: type,
    })
    return normalizeFlights(raw)
  })
}

export interface HotelParams {
  q: string
  check_in_date: string
  check_out_date: string
  adults?: number
}

export async function searchHotels(params: HotelParams, deps?: SearchDeps): Promise<Stay[]> {
  const { search, cache } = resolve(deps)
  const key = `google_hotels:${params.q}:${params.check_in_date}:${params.check_out_date}:${params.adults ?? 2}`
  const nights = nightsBetween(params.check_in_date, params.check_out_date)
  return withCache(cache, key, TTL.hotels, async () => {
    const raw = await search<RawHotelsResponse>('google_hotels', {
      q: params.q,
      check_in_date: params.check_in_date,
      check_out_date: params.check_out_date,
      adults: params.adults ?? 2,
    })
    return normalizeHotels(raw, nights)
  })
}

export interface StayDetailsParams {
  property_token: string
  check_in_date: string
  check_out_date: string
  adults?: number
}

/**
 * Full detail for one property: sub-ratings, the review histogram, what reviewers discuss, and
 * every provider selling the room. Served by the dedicated `google_hotels_property` engine.
 */
export async function getStayDetails(
  params: StayDetailsParams,
  deps?: SearchDeps,
): Promise<Stay | null> {
  const { search, cache } = resolve(deps)
  const key = `google_hotels_property:${params.property_token}:${params.check_in_date}:${params.check_out_date}:${params.adults ?? 2}`
  const nights = nightsBetween(params.check_in_date, params.check_out_date)
  return withCache(cache, key, TTL.hotels, async () => {
    const raw = await search<RawPropertyResponse>('google_hotels_property', {
      property_token: params.property_token,
      check_in_date: params.check_in_date,
      check_out_date: params.check_out_date,
      adults: params.adults ?? 2,
    })
    return normalizeHotelProperty(raw, nights)
  })
}

export interface PlaceParams {
  q: string
  ll?: string
}

export async function searchPlaces(params: PlaceParams, deps?: SearchDeps): Promise<Place[]> {
  const { search, cache } = resolve(deps)
  const key = `google_maps:${params.q}:${params.ll ?? ''}`
  return withCache(cache, key, TTL.places, async () => {
    const raw = await search<RawMapsResponse>('google_maps', {
      q: params.q,
      ll: params.ll,
    })
    return normalizePlaces(raw)
  })
}

export async function getPlaceReviews(placeId: string, deps?: SearchDeps): Promise<ReviewSnippet[]> {
  const { search, cache } = resolve(deps)
  const key = `google_maps_reviews:${placeId}`
  return withCache(cache, key, TTL.reviews, async () => {
    const raw = await search<RawReviewsResponse>('google_maps_reviews', { place_id: placeId })
    return normalizeReviews(raw)
  })
}

export async function getPlacePhotos(placeId: string, deps?: SearchDeps): Promise<string[]> {
  const { search, cache } = resolve(deps)
  const key = `google_maps_photos:${placeId}`
  return withCache(cache, key, TTL.photos, async () => {
    const raw = await search<RawPhotosResponse>('google_maps_photos', { place_id: placeId })
    return normalizePhotos(raw)
  })
}
