import { tool } from 'ai'
import { z } from 'zod'
import type { TripState, Flight, Stay, Place, ItineraryItem } from '../trip/types'
import type { ResultSet } from '../ui/results'
import type { OptionSet, PrefForm } from '../ui/interactions'
import {
  createTrip,
  setMeta,
  addFlight as addFlightR,
  removeFlight as removeFlightR,
  addStay as addStayR,
  removeStay as removeStayR,
  addItineraryItem as addItineraryItemR,
  removeItineraryItem as removeItineraryItemR,
} from '../trip/tripState'
import {
  searchFlights as apiSearchFlights,
  searchHotels as apiSearchHotels,
  searchPlaces as apiSearchPlaces,
  getPlaceReviews as apiGetPlaceReviews,
  getPlacePhotos as apiGetPlacePhotos,
  type SearchDeps,
} from '../searchapi/search'

export interface PlannerState {
  trip: TripState
  lastFlights: Flight[]
  lastStays: Stay[]
  lastPlaces: Place[]
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

export function buildPlannerTools(state: PlannerState, deps?: SearchDeps) {
  return {
    setTripMeta: tool({
      description: 'Set or update trip metadata: destination, dates (YYYY-MM-DD), travelers, budget.',
      inputSchema: z.object({
        destination: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        travelers: z.number().optional(),
        budget: z.number().optional(),
        title: z.string().optional().describe('Short evocative trip name, e.g. "Tenerife Escape"'),
      }),
      execute: async (patch) => {
        state.trip = setMeta(state.trip, patch)
        return { meta: state.trip.meta, estimatedTotal: state.trip.estimatedTotal }
      },
    }),

    searchFlights: tool({
      description:
        'Search flights between two airports on a date. Returns options with ids; add flights only by these ids.',
      inputSchema: z.object({
        departure_id: z.string().describe('IATA airport/city code, e.g. SKP'),
        arrival_id: z.string().describe('IATA airport/city code, e.g. FCO'),
        outbound_date: z.string().describe('YYYY-MM-DD'),
        flight_type: z.enum(['one_way', 'round_trip']).optional(),
      }),
      execute: async (params) => {
        state.lastFlights = await apiSearchFlights(params, deps)
        state.pendingResults.push({
          kind: 'flights',
          query: `${params.departure_id} → ${params.arrival_id}`,
          items: state.lastFlights,
        })
        return state.lastFlights.map((f) => ({
          id: f.id,
          from: f.from,
          to: f.to,
          airline: f.airline,
          departTime: f.departTime,
          arriveTime: f.arriveTime,
          stops: f.stops,
          price: f.price,
        }))
      },
    }),

    addFlight: tool({
      description: 'Add a flight to the trip by an id from the latest flight search.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const flight = state.lastFlights.find((f) => f.id === id)
        if (!flight) return { error: `No flight "${id}" in the latest search results.` }
        state.trip = addFlightR(state.trip, flight)
        return { added: flight.id, estimatedTotal: state.trip.estimatedTotal }
      },
    }),

    removeFlight: tool({
      description: 'Remove a flight from the trip by id.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        state.trip = removeFlightR(state.trip, id)
        return { removed: id, estimatedTotal: state.trip.estimatedTotal }
      },
    }),

    searchHotels: tool({
      description:
        'Search hotels/stays for a place and date range. Returns options with ids; add stays only by these ids.',
      inputSchema: z.object({
        q: z.string().describe('Location or hotel name, e.g. "Rome"'),
        check_in_date: z.string().describe('YYYY-MM-DD'),
        check_out_date: z.string().describe('YYYY-MM-DD'),
        adults: z.number().optional(),
      }),
      execute: async (params) => {
        state.lastStays = await apiSearchHotels(params, deps)
        state.pendingResults.push({ kind: 'stays', query: params.q, items: state.lastStays })
        return state.lastStays.map((s) => ({
          id: s.id,
          name: s.name,
          pricePerNight: s.pricePerNight,
          nights: s.nights,
          rating: s.rating,
          reviewCount: s.reviewCount,
        }))
      },
    }),

    addStay: tool({
      description: 'Add a stay to the trip by an id from the latest hotel search.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const stay = state.lastStays.find((s) => s.id === id)
        if (!stay) return { error: `No stay "${id}" in the latest search results.` }
        state.trip = addStayR(state.trip, stay)
        return { added: stay.id, estimatedTotal: state.trip.estimatedTotal }
      },
    }),

    removeStay: tool({
      description: 'Remove a stay from the trip by id.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        state.trip = removeStayR(state.trip, id)
        return { removed: id, estimatedTotal: state.trip.estimatedTotal }
      },
    }),

    searchPlaces: tool({
      description:
        'Search places/attractions/restaurants near a location. Returns options with ids; add to itinerary only by these ids.',
      inputSchema: z.object({
        q: z.string().describe('What to search, e.g. "top attractions in Rome"'),
        ll: z.string().optional().describe('GPS bias, format "@lat,lng,zoom"'),
      }),
      execute: async (params) => {
        state.lastPlaces = await apiSearchPlaces(params, deps)
        state.pendingResults.push({ kind: 'places', query: params.q, items: state.lastPlaces })
        return state.lastPlaces.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          rating: p.rating,
          reviewCount: p.reviewCount,
        }))
      },
    }),

    addPlaceToItinerary: tool({
      description: 'Add a searched place to a specific day of the itinerary (dayIndex is 0-based).',
      inputSchema: z.object({ id: z.string(), dayIndex: z.number().int().min(0) }),
      execute: async ({ id, dayIndex }) => {
        const place = state.lastPlaces.find((p) => p.id === id)
        if (!place) return { error: `No place "${id}" in the latest search results.` }
        const item: ItineraryItem = { placeId: place.id, name: place.name, coords: place.coords }
        state.trip = addItineraryItemR(state.trip, dayIndex, item)
        return { added: place.name, dayIndex }
      },
    }),

    removeItineraryItem: tool({
      description: 'Remove a place from a day of the itinerary by dayIndex + placeId.',
      inputSchema: z.object({ dayIndex: z.number().int().min(0), placeId: z.string() }),
      execute: async ({ dayIndex, placeId }) => {
        state.trip = removeItineraryItemR(state.trip, dayIndex, placeId)
        return { removed: placeId, dayIndex }
      },
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
