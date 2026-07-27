import { tool } from 'ai'
import { z } from 'zod'
import type { TripState, Flight, Stay, Place } from '../trip/types'
import type { ResultSet } from '../ui/results'
import type { OptionSet, PrefForm } from '../ui/interactions'
import { createTrip, setMeta } from '../trip/tripState'
import { mergeStayDetail } from '../trip/mergeStay'
import {
  searchFlights as apiSearchFlights,
  searchHotels as apiSearchHotels,
  searchPlaces as apiSearchPlaces,
  getPlaceReviews as apiGetPlaceReviews,
  getPlacePhotos as apiGetPlacePhotos,
  getStayDetails as apiGetStayDetails,
  type SearchDeps,
} from '../searchapi/search'

export interface PlannerState {
  trip: TripState
  lastFlights: Flight[]
  lastStays: Stay[]
  lastPlaces: Place[]
  /** Dates of the latest hotel search, so a property lookup can reuse them. */
  lastStayQuery?: { check_in_date: string; check_out_date: string; adults?: number }
  pendingResults: ResultSet[]
  pendingOptions: OptionSet[]
  pendingForms: PrefForm[]
}

export function createPlannerState(trip?: TripState): PlannerState {
  return {
    trip: trip ?? createTrip('draft'),
    lastFlights: [],
    lastStays: [],
    lastPlaces: [],
    pendingResults: [],
    pendingOptions: [],
    pendingForms: [],
  }
}

function hours(minutes?: number): string | undefined {
  if (minutes === undefined) return undefined
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/**
 * Run a search and hand failures back as data. A thrown tool error reaches the model as a bare
 * "An error occurred"; the provider's own message tells it what to fix and retry.
 */
export async function withToolError<T>(run: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await run()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `Search failed: ${message}. Fix the parameters and try again.` }
  }
}

export function buildPlannerTools(state: PlannerState, deps?: SearchDeps) {
  return {
    setTripMeta: tool({
      description: 'Set or update trip metadata: destination, dates (YYYY-MM-DD), travelers, budget.',
      inputSchema: z.object({
        destination: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        travelers: z.number().optional().describe('Total heads, adults + children'),
        budget: z.number().optional(),
        title: z.string().optional().describe('Short evocative trip name, e.g. "Tenerife Escape"'),
        origin: z.string().optional().describe('Where they depart from (city or IATA code)'),
        rooms: z.number().optional(),
        adults: z.number().optional(),
        children: z.number().optional(),
      }),
      execute: async (patch) => {
        state.trip = setMeta(state.trip, patch)
        return { meta: state.trip.meta, estimatedTotal: state.trip.estimatedTotal }
      },
    }),

    searchFlights: tool({
      description:
        'Search flights between two airports. Dates must be today or later. For a round trip you MUST pass return_date. The traveler picks what goes into the plan — you only surface options.',
      inputSchema: z.object({
        departure_id: z.string().describe('IATA airport/city code, e.g. SKP'),
        arrival_id: z.string().describe('IATA airport/city code, e.g. FCO'),
        outbound_date: z.string().describe('YYYY-MM-DD, today or later'),
        return_date: z
          .string()
          .optional()
          .describe('YYYY-MM-DD — required when flight_type is round_trip'),
        flight_type: z.enum(['one_way', 'round_trip']).optional(),
      }),
      execute: async (params) =>
        withToolError(async () => {
          state.lastFlights = await apiSearchFlights(params, deps)
          state.pendingResults.push({
            kind: 'flights',
            query: `${params.departure_id} → ${params.arrival_id}`,
            items: state.lastFlights,
          })
          return state.lastFlights.slice(0, 10).map((f) => ({
            id: f.id,
            from: f.from,
            to: f.to,
            airline: f.airline,
            departTime: f.departTime,
            arriveTime: f.arriveTime,
            duration: hours(f.durationMinutes),
            stops: f.stops,
            via: f.layovers?.map((l) => l.code).filter(Boolean),
            price: f.price,
          }))
        }),
    }),



    searchHotels: tool({
      description:
        'Search hotels/stays for a place and date range. The traveler picks what goes into the plan — you only surface options.',
      inputSchema: z.object({
        q: z.string().describe('Location or hotel name, e.g. "Rome"'),
        check_in_date: z.string().describe('YYYY-MM-DD, today or later'),
        check_out_date: z.string().describe('YYYY-MM-DD, after check_in_date'),
        adults: z.number().optional(),
      }),
      execute: async (params) =>
        withToolError(async () => {
          state.lastStays = await apiSearchHotels(params, deps)
          state.lastStayQuery = {
            check_in_date: params.check_in_date,
            check_out_date: params.check_out_date,
            adults: params.adults,
          }
          state.pendingResults.push({ kind: 'stays', query: params.q, items: state.lastStays })
          return state.lastStays.slice(0, 10).map((s) => ({
            id: s.id,
            name: s.name,
            kind: s.kind,
            hotelClass: s.hotelClass,
            pricePerNight: s.pricePerNight,
            nights: s.nights,
            total: s.totalPrice ?? s.pricePerNight * s.nights,
            rating: s.rating,
            reviewCount: s.reviewCount,
            deal: s.dealBadge,
            area: s.address,
          }))
        }),
    }),

    getStayDetails: tool({
      description:
        'Fetch full detail for a stay from the latest hotel search (description, amenities, what reviewers say, check-in times, nearby). Use before recommending a stay so your pros and cons are real.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) =>
        withToolError(async () => {
          const index = state.lastStays.findIndex((s) => s.id === id)
          const stay = state.lastStays[index]
          if (!stay) return { error: `No stay "${id}" in the latest search results.` }
          if (!stay.propertyToken || !state.lastStayQuery) {
            return { error: 'No extra detail is available for this stay.' }
          }
          const full = await apiGetStayDetails(
            { property_token: stay.propertyToken, ...state.lastStayQuery },
            deps,
          )
          if (!full) return { error: 'No extra detail is available for this stay.' }

          // Keep the enriched stay in place so later emits and add-to-trip carry it.
          const enriched = mergeStayDetail(stay, full)
          state.lastStays[index] = enriched
          return {
            amenities: enriched.amenities?.slice(0, 12),
            missing: enriched.excludedAmenities?.slice(0, 6),
            checkIn: enriched.checkInTime,
            checkOut: enriched.checkOutTime,
            address: enriched.address,
            ratings: {
              overall: enriched.rating,
              location: enriched.locationRating,
              transit: enriched.transitRating,
              thingsToDo: enriched.thingsToDoRating,
            },
            priceInsight: enriched.priceInsight,
            topics: enriched.reviewTopics?.slice(0, 6),
            reviews: enriched.reviewSnippets?.slice(0, 4).map((r) => r.text),
            nearby: enriched.nearbyPlaces?.slice(0, 5).map((n) => ({ name: n.name, transit: n.transit })),
            bookableFrom: enriched.offers?.slice(0, 4).map((o) => o.source),
          }
        }),
    }),



    searchPlaces: tool({
      description:
        'Search places, attractions and restaurants near a location. The traveler picks what goes into the plan — you only surface options.',
      inputSchema: z.object({
        q: z.string().describe('What to search, e.g. "top attractions in Rome"'),
        ll: z.string().optional().describe('GPS bias, format "@lat,lng,zoom"'),
      }),
      execute: async (params) =>
        withToolError(async () => {
          state.lastPlaces = await apiSearchPlaces(params, deps)
          state.pendingResults.push({ kind: 'places', query: params.q, items: state.lastPlaces })
          return state.lastPlaces.slice(0, 12).map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            rating: p.rating,
            reviewCount: p.reviewCount,
            price: p.priceRange,
            hours: p.hours,
            address: p.address,
          }))
        }),
    }),



    getPlaceDetails: tool({
      description:
        'Fetch reviews and photos for a searched place by id, to enrich its card. Use before recommending so you can cite real pros and cons.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const [reviews, photos] = await Promise.all([
          apiGetPlaceReviews(id, deps),
          apiGetPlacePhotos(id, deps),
        ])
        const place = state.lastPlaces.find((p) => p.id === id)
        if (place) {
          place.reviewSnippets = reviews
          if (photos.length) place.photos = photos
        }
        return { reviews: reviews.slice(0, 5), photos: photos.slice(0, 5) }
      },
    }),

    presentOptions: tool({
      description:
        'Show the traveler a short menu of next steps to choose from (e.g. Find a hotel / Look up flights / Build the full trip). After calling this, STOP and wait for their choice.',
      inputSchema: z.object({
        question: z.string().optional(),
        options: z
          .array(z.object({ label: z.string(), prompt: z.string() }))
          .min(1)
          .describe('Each option: a short label and the prompt to send when chosen.'),
      }),
      execute: async ({ question, options }) => {
        state.pendingOptions.push({ question, options })
        return { presented: options.length }
      },
    }),

    askPreferences: tool({
      description:
        "Ask a preference question with preset options — mode 'multi' for interests (pick several), 'single' for a single choice like pace. After calling this, STOP and wait.",
      inputSchema: z.object({
        question: z.string(),
        mode: z.enum(['single', 'multi']),
        options: z.array(z.string()).min(2),
      }),
      execute: async ({ question, mode, options }) => {
        state.pendingForms.push({ question, mode, options })
        return { presented: options.length }
      },
    }),
  }
}
