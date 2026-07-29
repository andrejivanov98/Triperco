import type { Flight, Stay, Place, ReviewSnippet } from '../trip/types'
import { searchApi, type SearchApiOptions, type SearchParams } from './client'
import { createInMemoryCache, withCache, type Cache } from './cache'
import { normalizeFlights, departureTokens, type RawFlightsResponse } from './normalizeFlights'
import { normalizeHotels, type RawHotelsResponse } from './normalizeHotels'
import { normalizeHotelProperty, type RawPropertyResponse } from './normalizeHotelProperty'
import { normalizePlaces, type RawMapsResponse } from './normalizePlaces'
import { normalizeEvents, type RawEventsResponse } from './normalizeEvents'
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
  events: 3_600, // 1 h — listings change and dates pass
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

/** Verified against the live provider — these are the exact values it accepts. */
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first_class'
export type StopsFilter = 'any' | 'nonstop' | 'one_stop_or_fewer' | 'two_stops_or_fewer'

/** One hop of a multi-city trip. */
export interface FlightLeg {
  departure_id: string
  arrival_id: string
  outbound_date: string
}

export interface FlightParams {
  departure_id: string
  arrival_id: string
  outbound_date: string
  /** Required by the provider for round trips. */
  return_date?: string
  flight_type?: 'one_way' | 'round_trip'
  /** Mark a search that is deliberately only the way home. */
  direction?: 'outbound' | 'return'
  travel_class?: CabinClass
  stops?: StopsFilter
  adults?: number
  children?: number
  infants_in_seat?: number
  infants_on_lap?: number
}

/** Shift a YYYY-MM-DD date by whole days, staying in UTC so no timezone can move it. */
function shiftDate(date: string, days: number): string {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(time)) return date
  return new Date(time + days * 86_400_000).toISOString().slice(0, 10)
}

/** How far either side of the named date we will look. More than this is a different trip. */
export const MAX_FLEX_DAYS = 3

/**
 * "Give or take a few days." The provider has no flexible-date parameter, so this is genuinely a
 * wider search: one call per offset, capped at three, with the whole trip shifted together so the
 * stay length never changes.
 *
 * The results merge into one set, so the existing ranking floats the cheapest date to the front and
 * each card still shows the day it actually leaves.
 */
export async function searchFlightsFlexible(
  params: FlightParams,
  flexDays: number,
  deps?: SearchDeps,
): Promise<Flight[]> {
  const flex = Math.min(MAX_FLEX_DAYS, Math.max(0, Math.trunc(flexDays)))
  if (flex === 0) return searchFlights(params, deps)

  const offsets = [-flex, 0, flex]
  const runs = await Promise.all(
    offsets.map((offset) =>
      searchFlights(
        {
          ...params,
          outbound_date: shiftDate(params.outbound_date, offset),
          return_date: params.return_date ? shiftDate(params.return_date, offset) : undefined,
        },
        deps,
      ).catch(() => [] as Flight[]),
    ),
  )

  // Two offsets can surface the same itinerary; keep the first sighting of each.
  const seen = new Set<string>()
  return runs.flat().filter((flight) => {
    if (seen.has(flight.id)) return false
    seen.add(flight.id)
    return true
  })
}

/** Three or more hops in one booking. Priced as one journey, so it never pairs return legs. */
export interface MultiCityParams {
  legs: FlightLeg[]
  travel_class?: CabinClass
  stops?: StopsFilter
  adults?: number
  children?: number
}

/**
 * A trip with more than two hops. The provider takes the whole journey as one payload and returns
 * fares for it, so there is no outbound/return pairing to do.
 */
export async function searchMultiCity(
  params: MultiCityParams,
  deps?: SearchDeps,
): Promise<Flight[]> {
  const { search, cache } = resolve(deps)
  const legs = params.legs
    .filter((l) => l.departure_id && l.arrival_id && l.outbound_date)
    .map((l) => ({
      departure_id: resolveAirport(l.departure_id),
      arrival_id: resolveAirport(l.arrival_id),
      outbound_date: l.outbound_date,
    }))
  if (legs.length < 2) return []

  const shape = legs.map((l) => `${l.departure_id}-${l.arrival_id}-${l.outbound_date}`).join('|')
  const key = `google_flights:multi:${shape}:${params.travel_class ?? ''}:${params.stops ?? ''}`
  return withCache(cache, key, TTL.flights, async () => {
    const raw = await search<RawFlightsResponse>('google_flights', {
      flight_type: 'multi_city',
      multi_city_json: JSON.stringify(legs),
      travel_class: params.travel_class,
      stops: params.stops,
      adults: params.adults,
      children: params.children,
    })
    return normalizeFlights(raw, 'outbound')
  })
}

/** How many round trips we complete with a return leg. Each one costs an extra provider call. */
const ROUND_TRIP_PAIRS = 4

/**
 * City-wide codes look right but return noticeably fewer itineraries than the city's main
 * international airport — BUE gave 5 options where EZE gave 13 on the same route and date. Google
 * treats them as a weaker query, so we resolve them to the airport people actually fly into.
 */
const METRO_TO_PRIMARY: Record<string, string> = {
  BUE: 'EZE', // Buenos Aires
  RIO: 'GIG', // Rio de Janeiro
  SAO: 'GRU', // São Paulo
  NYC: 'JFK', // New York
  WAS: 'IAD', // Washington
  CHI: 'ORD', // Chicago
  LON: 'LHR', // London
  PAR: 'CDG', // Paris
  MIL: 'MXP', // Milan
  ROM: 'FCO', // Rome
  MOW: 'SVO', // Moscow
  STO: 'ARN', // Stockholm
  TYO: 'HND', // Tokyo
  OSA: 'KIX', // Osaka
  SEL: 'ICN', // Seoul
  BJS: 'PEK', // Beijing
  SHA: 'PVG', // Shanghai
  BUH: 'OTP', // Bucharest
  TCI: 'TFS', // Tenerife
}

/** Resolve a city-wide code to the airport that actually returns results. */
export function resolveAirport(code: string): string {
  const upper = code.trim().toUpperCase()
  return METRO_TO_PRIMARY[upper] ?? code.trim()
}

export async function searchFlights(params: FlightParams, deps?: SearchDeps): Promise<Flight[]> {
  const { search, cache } = resolve(deps)
  // The provider rejects a round trip with no return date, so treat that as a one-way search.
  const type = params.flight_type === 'round_trip' && params.return_date ? 'round_trip' : 'one_way'
  const returnDate = type === 'round_trip' ? params.return_date : undefined
  const direction = params.direction ?? 'outbound'
  const from = resolveAirport(params.departure_id)
  const to = resolveAirport(params.arrival_id)
  const filters = `${params.travel_class ?? ''}:${params.stops ?? ''}:${params.adults ?? ''}:${params.children ?? ''}:${params.infants_in_seat ?? ''}:${params.infants_on_lap ?? ''}`
  const key = `google_flights:${from}:${to}:${params.outbound_date}:${returnDate ?? ''}:${type}:${direction}:${filters}`

  return withCache(cache, key, TTL.flights, async () => {
    const query = {
      departure_id: from,
      arrival_id: to,
      outbound_date: params.outbound_date,
      return_date: returnDate,
      flight_type: type,
      travel_class: params.travel_class,
      stops: params.stops,
      adults: params.adults,
      children: params.children,
      infants_in_seat: params.infants_in_seat,
      infants_on_lap: params.infants_on_lap,
    }
    const raw = await search<RawFlightsResponse>('google_flights', query)
    const outbound = normalizeFlights(raw, direction)
    if (type === 'one_way') return outbound

    /*
     * A round trip is priced as one fare but served in two steps: the first response holds outbound
     * options with a departure_token, and that token fetches the return options for that outbound.
     * We pair each of the first few outbounds with its best return so the traveler picks one card
     * and gets both legs.
     */
    const tokens = departureTokens(raw)
    const candidates = outbound
      .slice(0, ROUND_TRIP_PAIRS)
      .map((flight) => ({ flight, token: tokens.find((t) => t.id === flight.id)?.token }))
      .filter((c): c is { flight: Flight; token: string } => Boolean(c.token))

    /*
     * Fetch the return legs concurrently. Doing this in sequence cost five round trips end to end,
     * which on a long-haul route ran past the request budget and aborted the whole search — the
     * traveler saw no flights at all for a route that has plenty.
     *
     * A leg that fails or times out just drops its pairing; a partial answer beats none.
     */
    const settled = await Promise.all(
      candidates.map(async ({ flight, token }): Promise<Flight | null> => {
        try {
          const returnRaw = await search<RawFlightsResponse>('google_flights', {
            ...query,
            departure_token: token,
          })
          const returnLeg = normalizeFlights(returnRaw, 'return')[0]
          return returnLeg ? { ...flight, returnLeg } : null
        } catch {
          return null
        }
      }),
    )

    const paired = settled.filter((f): f is Flight => f !== null)
    // If the provider gave us no returns at all, the outbound options are still useful.
    return paired.length > 0 ? paired : outbound
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

export interface EventParams {
  q: string
  /** e.g. "date:month" to widen past this week. */
  htichips?: string
}

/**
 * What is actually on while they are there. Events are a different thing from attractions: they
 * happen once, so a date that misses the trip makes one useless however good it is.
 */
export async function searchEvents(params: EventParams, deps?: SearchDeps): Promise<Place[]> {
  const { search, cache } = resolve(deps)
  const key = `google_events:${params.q}:${params.htichips ?? ''}`
  return withCache(cache, key, TTL.events, async () => {
    const raw = await search<RawEventsResponse>('google_events', {
      q: params.q,
      htichips: params.htichips,
    })
    return normalizeEvents(raw)
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

/**
 * A photo of a destination city for the plan hero: find the place on Maps, then take its best
 * photo. Returns null rather than throwing — a missing cover is cosmetic.
 */
export async function getDestinationPhoto(
  destination: string,
  deps?: SearchDeps,
): Promise<string | null> {
  const { cache } = resolve(deps)
  const key = `destination_photo:${destination.toLowerCase()}`
  return withCache(cache, key, TTL.photos, async () => {
    try {
      const places = await searchPlaces({ q: destination }, deps)
      const first = places[0]
      if (!first) return null
      const photos = await getPlacePhotos(first.id, deps)
      return photos[0] ?? first.photos[0] ?? null
    } catch {
      return null
    }
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
