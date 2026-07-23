import { tool } from 'ai'
import { z } from 'zod'
import type { TripState, Flight, Stay, Place } from '../trip/types'
import {
  createTrip,
  setMeta,
  addFlight as addFlightR,
  removeFlight as removeFlightR,
  addStay as addStayR,
  removeStay as removeStayR,
} from '../trip/tripState'
import {
  searchFlights as apiSearchFlights,
  searchHotels as apiSearchHotels,
  type SearchDeps,
} from '../searchapi/search'

export interface PlannerState {
  trip: TripState
  lastFlights: Flight[]
  lastStays: Stay[]
  lastPlaces: Place[]
}

export function createPlannerState(trip?: TripState): PlannerState {
  return {
    trip: trip ?? createTrip('draft'),
    lastFlights: [],
    lastStays: [],
    lastPlaces: [],
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
  }
}
