import { tool } from 'ai'
import { z } from 'zod'
import type { Coords, TripState, Flight, Stay, Place } from '../trip/types'
import type { ResultSet } from '../ui/results'
import { makeSetKey } from '../ui/results'
import { rankResults } from '../ui/rank'
import type { DetailRequest, OptionSet, PrefForm, ReplySuggestions } from '../ui/interactions'
import { createTrip, setMeta } from '../trip/tripState'
import { mergeStayDetail } from '../trip/mergeStay'
import { stayVerdict } from '../trip/stayVerdict'
import { classifyActivity, eventOutsideTrip } from '../trip/activityKind'
import { asBias, partitionNear, PLACE_RADIUS_KM, STAY_RADIUS_KM } from '../trip/geo'
import { journeyCandidates } from '../trip/connections'
import { anchorToDestination, offDestinationError } from './grounding'
import {
  searchFlights as apiSearchFlights,
  searchFlightsFlexible as apiSearchFlightsFlexible,
  searchMultiCity as apiSearchMultiCity,
  searchHotels as apiSearchHotels,
  searchPlaces as apiSearchPlaces,
  searchEvents as apiSearchEvents,
  findTransferRoute as apiFindTransferRoute,
  geocodePlace as apiGeocodePlace,
  getPlaceReviews as apiGetPlaceReviews,
  getPlacePhotos as apiGetPlacePhotos,
  enrichPlaces as apiEnrichPlaces,
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
  pendingDetails: DetailRequest[]
  pendingSuggestions: ReplySuggestions[]
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
    pendingDetails: [],
    pendingSuggestions: [],
  }
}

function hours(minutes?: number): string | undefined {
  if (minutes === undefined) return undefined
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** How many options one tool result describes. A little past what the carousel shows, so the agent has room to compare. */
const TOOL_RESULT_LIMIT = 12

/** The places member of the union, so a bucket keeps its `Place[]` items through a reassignment. */
type PlaceSet = Extract<ResultSet, { kind: 'places' }>

/**
 * How many places one search enriches with photos and reviews, across every bucket it produced.
 *
 * Shared rather than per-bucket on purpose. One search can split four ways, so enriching three of
 * each would be twenty-four provider calls to answer a single question.
 */
export const ENRICH_BUDGET = 4

/**
 * Spread the enrichment budget over the buckets, one at a time round-robin.
 *
 * Every carousel's leading card is what gets read, so each bucket gets its first place filled in
 * before any bucket gets a second. Returns a per-bucket count, in the order given.
 */
export function allocateEnrichment(sizes: number[], budget = ENRICH_BUDGET): number[] {
  const quota = sizes.map(() => 0)
  let spent = 0
  let progressed = true
  while (spent < budget && progressed) {
    progressed = false
    for (const [i, size] of sizes.entries()) {
      if (spent >= budget) break
      if (quota[i] >= size) continue
      quota[i] += 1
      spent += 1
      progressed = true
    }
  }
  return quota
}

/**
 * A result set in the order the traveler will see it, so "the first one" means the same thing to the
 * agent and to the person reading the cards.
 *
 * Before this, tools described the provider's own order while the screen showed our ranking, so the
 * agent's "the first is cheapest" could point at the third card.
 */
function asShown<T extends Flight | Stay | Place>(set: ResultSet): T[] {
  return rankResults(set, TOOL_RESULT_LIMIT).map((entry) => entry.item as T)
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

/**
 * Whether a flight search names a route that cannot be the one intended, and why.
 *
 * Only the certainties. Both are catchable without a lookup, and neither has a legitimate reading:
 * nobody flies from an airport to itself, and an outbound leg that lands back at the origin is the
 * trip inverted. Null means the route is fine as far as we can tell from the codes alone.
 */
export function badFlightRoute(
  params: { departure_id: string; arrival_id: string; direction?: 'outbound' | 'return' },
  trip: TripState,
): string | null {
  const from = params.departure_id.trim().toUpperCase()
  const to = params.arrival_id.trim().toUpperCase()
  if (from && from === to) {
    return `departure_id and arrival_id are both ${from}. Name the airport they are flying to.`
  }
  const origin = trip.meta.origin?.trim().toUpperCase()
  if (origin && to === origin && params.direction !== 'return') {
    return (
      `arrival_id ${to} is where they are setting off from. The way out lands at an airport serving ` +
      `${trip.meta.destination ?? 'the destination'} — use direction "return" for the flight home.`
    )
  }
  return null
}

/**
 * Where the trip is, as a point, resolved at most once per turn.
 *
 * Every search this turn is fenced against it, so it must not cost a provider call each time. Null
 * means the destination could not be placed — in which case nothing is fenced, because a filter we
 * cannot justify is worse than no filter at all.
 */
function destinationFence(state: PlannerState, deps?: SearchDeps) {
  // Keyed on the name, not just held: setTripMeta can change the destination part-way through a turn,
  // and a fence still centred on the old city would drop every result from the new one.
  let memo: { where: string; point: Promise<Coords | null> } | undefined
  return {
    get destination(): string | undefined {
      return state.trip.meta.destination?.trim() || undefined
    },
    async centre(): Promise<Coords | null> {
      const where = this.destination
      if (!where) return null
      if (memo?.where !== where) memo = { where, point: apiGeocodePlace(where, deps) }
      return memo.point
    },
  }
}

export function buildPlannerTools(state: PlannerState, deps?: SearchDeps) {
  const fence = destinationFence(state, deps)

  return {
    setTripMeta: tool({
      description: 'Record what you have learned about the trip: destination, dates (YYYY-MM-DD), party, title. Never guess a budget — only the traveler sets one.',
      inputSchema: z.object({
        destination: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        travelers: z.number().optional().describe('Total heads, adults + children'),
        title: z.string().optional().describe('Short evocative trip name, e.g. "Tenerife Escape"'),
        origin: z.string().optional().describe('Where they depart from (city or IATA code)'),
        rooms: z.number().optional(),
        adults: z.number().optional(),
        children: z.number().optional(),
        infants: z.number().optional().describe('Under 2'),
        childrenAges: z.array(z.number()).optional().describe('Ages of the children, if mentioned'),
        pets: z.number().optional().describe('Animals travelling with them'),
        dateFlexDays: z
          .number()
          .optional()
          .describe('How many days either side they can move, if they said their dates are flexible'),
        pace: z
          .enum(['fast', 'explore', 'detailed'])
          .optional()
          .describe(
            'How they want to be helped, read from how they talk. "fast" — decisive, wants the answer ' +
              '("just book something cheap", "surprise me"). "explore" — browsing, wants to compare ' +
              '("what are my options?", "show me a few"). "detailed" — planning properly ("I want to ' +
              'see everything", "plan it day by day"). Record it the moment you can tell, and revise it ' +
              'if they change register.',
          ),
        vibe: z
          .array(
            z.enum([
              'relaxed',
              'foodie',
              'culture',
              'nightlife',
              'family',
              'adventure',
              'budget',
              'luxury',
            ]),
          )
          .optional()
          .describe('The sort of trip they want, from what they said. Only what they actually signalled.'),
        skipped: z
          .array(z.enum(['transport', 'stay', 'activities']))
          .optional()
          .describe(
            'Parts they are handling themselves — "we are driving down", "staying with my sister", ' +
              '"we will wing the days". A skipped part counts as settled and stops being offered.',
          ),
      }),
      execute: async (patch) => {
        state.trip = setMeta(state.trip, patch)
        return { meta: state.trip.meta, estimatedTotal: state.trip.estimatedTotal }
      },
    }),

    searchFlights: tool({
      description:
        'Search flights. Dates must be today or later. Pass flight_type "round_trip" WITH return_date to offer round trips (each result covers both legs); use "one_way" for a single leg, and direction "return" when searching only the way home. Search one-ways and round trips separately, never mixed. The traveler picks what goes into the plan.',
      inputSchema: z.object({
        departure_id: z.string().describe('IATA airport/city code, e.g. SKP'),
        arrival_id: z.string().describe('IATA airport/city code, e.g. FCO'),
        outbound_date: z.string().describe('YYYY-MM-DD, today or later'),
        return_date: z
          .string()
          .optional()
          .describe('YYYY-MM-DD — required when flight_type is round_trip'),
        flight_type: z.enum(['one_way', 'round_trip']).optional(),
        direction: z
          .enum(['outbound', 'return'])
          .optional()
          .describe(
            'Use "return" for a one-way search of just the way home (swap the airports and use the return date). Choosing a round_trip result fills both legs at once.',
          ),
        travel_class: z
          .enum(['economy', 'premium_economy', 'business', 'first_class'])
          .optional()
          .describe('Only pass this when the traveler asked for a cabin.'),
        stops: z
          .enum(['any', 'nonstop', 'one_stop_or_fewer', 'two_stops_or_fewer'])
          .optional()
          .describe('Pass "nonstop" when they say direct flights only.'),
        adults: z.number().optional(),
        children: z.number().optional().describe('Aged 2-11'),
        infants_in_seat: z.number().optional().describe('Under 2, with their own seat'),
        infants_on_lap: z.number().optional().describe('Under 2, on a lap'),
        flex_days: z
          .number()
          .optional()
          .describe(
            'Give or take this many days, 1-3. Shifts the whole trip together and merges the results, so the cheapest date wins. Costs one extra search per side — only use it when they say their dates are flexible.',
          ),
      }),
      execute: async ({ flex_days, ...params }) =>
        withToolError(async () => {
          /*
           * The two checks a route can fail on its own terms, with no lookup and no false positives.
           * A flight from an airport to itself is nonsense; a flight *back to where they set off
           * from* dressed as the way out is the same wrong-city failure as an American hotel, and it
           * costs a whole search to discover on screen.
           *
           * Deliberately no distance check against the destination. A destination named loosely —
           * "Spain", "the Canaries" — geocodes to a centre hundreds of kilometres from the airport a
           * traveler would actually use, and refusing that search would be a worse bug than the one
           * being fixed.
           */
          const routed = badFlightRoute(params, state.trip)
          if (routed) return { error: routed }

          state.lastFlights = flex_days
            ? await apiSearchFlightsFlexible(params, flex_days, deps)
            : await apiSearchFlights(params, deps)
          const roundTrip = state.lastFlights.some((f) => f.returnLeg)
          const flightType = roundTrip
            ? ('round_trip' as const)
            : params.direction === 'return'
              ? ('return' as const)
              : ('one_way' as const)
          // Same route, same leg means the same question — searching it again revises the set.
          const route = `${params.departure_id} → ${params.arrival_id}`
          const set: ResultSet = {
            kind: 'flights',
            query: route,
            setKey: makeSetKey('flights', route, flightType),
            items: state.lastFlights,
            flightType,
          }
          state.pendingResults.push(set)
          return asShown<Flight>(set).map((f) => ({
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
            leg: f.direction ?? 'outbound',
            // Present only on a round trip: this option covers the way home too.
            returns: f.returnLeg
              ? `${f.returnLeg.from}→${f.returnLeg.to} ${f.returnLeg.departDate ?? ''} ${f.returnLeg.departTime ?? ''}`.trim()
              : undefined,
          }))
        }),
    }),



    searchMultiCityFlights: tool({
      description:
        'Search a journey with three or more hops in one booking, e.g. Skopje → Rome → Barcelona → Skopje. The provider prices the whole journey as one fare, so this is not the same as several one-way searches. Use it when the traveler wants to string cities together.',
      inputSchema: z.object({
        legs: z
          .array(
            z.object({
              departure_id: z.string().describe('IATA code'),
              arrival_id: z.string().describe('IATA code'),
              outbound_date: z.string().describe('YYYY-MM-DD, today or later'),
            }),
          )
          .min(2)
          .describe('In travel order.'),
        travel_class: z.enum(['economy', 'premium_economy', 'business', 'first_class']).optional(),
        stops: z.enum(['any', 'nonstop', 'one_stop_or_fewer', 'two_stops_or_fewer']).optional(),
        adults: z.number().optional(),
        children: z.number().optional(),
      }),
      execute: async (params) =>
        withToolError(async () => {
          state.lastFlights = await apiSearchMultiCity(params, deps)
          const route = params.legs.map((l) => l.departure_id).concat(params.legs.at(-1)!.arrival_id).join(' → ')
          const set: ResultSet = {
            kind: 'flights',
            query: route,
            setKey: makeSetKey('flights', route, 'one_way'),
            items: state.lastFlights,
            flightType: 'one_way',
          }
          state.pendingResults.push(set)
          return asShown<Flight>(set).map((f) => ({
            id: f.id,
            airline: f.airline,
            from: f.from,
            to: f.to,
            departTime: f.departTime,
            departDate: f.departDate,
            duration: hours(f.durationMinutes),
            stops: f.stops,
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
        adults: z.number().optional().describe('Pass the real count from the trip, not a default'),
        sort_by: z
          .enum(['relevance', 'lowest_price', 'highest_rating', 'most_reviewed'])
          .optional()
          .describe('Leave unset for the best overall mix; use lowest_price only when asked for cheap'),
        property_type: z
          .enum(['hotel', 'vacation_rental'])
          .optional()
          .describe('Set when the traveler asked specifically for a hotel or for an apartment/home'),
      }),
      execute: async (params) =>
        withToolError(async () => {
          /*
           * Anchored before the search and fenced after it. `google_hotels` resolves a query with no
           * locality in it against its own default, which is the United States — so "hotels" for a
           * Barcelona trip really did come back as American hotels, and no amount of prompt could
           * have stopped it, because the wrong question had already been asked.
           */
          const q = anchorToDestination(params.q, fence.destination)
          // Both provider calls at once: placing the destination is not something the hotel search
          // has to wait for, and a hotel search is the slowest thing on this screen.
          const [found, centre] = await Promise.all([
            apiSearchHotels({ ...params, q }, deps),
            fence.centre(),
          ])
          const { near, far } = partitionNear(found, centre, STAY_RADIUS_KM)
          if (near.length === 0 && far.length > 0) {
            return { error: offDestinationError(fence.destination!, 'stays') }
          }

          state.lastStays = near
          state.lastStayQuery = {
            check_in_date: params.check_in_date,
            check_out_date: params.check_out_date,
            adults: params.adults,
          }
          const set: ResultSet = {
            kind: 'stays',
            query: q,
            setKey: makeSetKey('stays', q),
            items: state.lastStays,
          }
          state.pendingResults.push(set)
          return asShown<Stay>(set).map((s) => ({
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
          // Real trade-offs, derived from the provider's own breakdown — never your own guess.
          const verdict = stayVerdict(enriched)
          return {
            loved: verdict.loved.map((f) => f.topic),
            watchOuts: verdict.watchOuts.map((f) => f.topic),
            notAvailable: verdict.missing,
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
        'Search things to see and do near a location. Results are split into places to visit ' +
        '(museums, landmarks, viewpoints), things to do (food, drink, spas, activities) and tours ' +
        '(booked ahead) — they are different offers and never share a carousel, so write a query for ' +
        'the one you want: "top sights in Rome" vs "best restaurants in Rome" vs "walking tours in Rome". ' +
        'The traveler picks what goes into the plan — you only surface options.',
      inputSchema: z.object({
        q: z.string().describe('What to search, e.g. "top sights in Rome" or "best restaurants in Rome"'),
        ll: z.string().optional().describe('GPS bias, format "@lat,lng,zoom"'),
      }),
      execute: async (params) =>
        withToolError(async () => {
          /*
           * The query is anchored to the destination, and the destination's own coordinates become
           * the GPS bias when the model gave none. `google_maps` with neither is the search that
           * returned American restaurants for a Spanish trip: with no locality and no bias it has
           * nothing to go on but its own default.
           */
          const q = anchorToDestination(params.q, fence.destination)
          const centre = await fence.centre()
          const ll = params.ll ?? (centre ? asBias(centre) : undefined)
          const { near: found, far } = partitionNear(
            await apiSearchPlaces({ q, ll }, deps),
            centre,
            PLACE_RADIUS_KM,
          )
          if (found.length === 0 && far.length > 0) {
            return { error: offDestinationError(fence.destination!, 'places') }
          }

          /*
           * Four different offers, four carousels. Somewhere you go to see something, somewhere you
           * go to do something, something you book, and something with a fixed date are not
           * interchangeable suggestions, and one merged list made them look like they were.
           */
          const drafts = (['attraction', 'activity', 'tour', 'event'] as const)
            .map((kind) => ({ kind, items: found.filter((p) => classifyActivity(p) === kind) }))
            .filter((draft) => draft.items.length > 0)

          const quota = allocateEnrichment(drafts.map((d) => d.items.length))

          const live = await Promise.all(
            drafts.map(async ({ kind, items }, i) => {
              const set: PlaceSet = {
                kind: 'places',
                query: q,
                setKey: makeSetKey('places', q, kind),
                placeKind: kind,
                items,
              }
              // Enrich in ranked order, so the cards that arrive complete are the ones read first.
              const ranked = asShown<Place>(set)
              set.items = [
                ...(await apiEnrichPlaces(ranked, quota[i], deps)),
                ...items.filter((p) => !ranked.includes(p)),
              ]
              return set
            }),
          )

          for (const set of live) state.pendingResults.push(set)
          // Keep the enriched copies, so a later detail lookup or add carries the photos we fetched.
          state.lastPlaces = live.flatMap((set) => set.items)

          return state.lastPlaces.slice(0, TOOL_RESULT_LIMIT).map((p) => ({
            id: p.id,
            name: p.name,
            kind: classifyActivity(p),
            category: p.category,
            rating: p.rating,
            reviewCount: p.reviewCount,
            price: p.priceRange,
            hours: p.hours,
            address: p.address,
            // So a recommendation can quote something real without a second lookup.
            reviewQuote: p.reviewSnippets[0]?.text?.slice(0, 200),
            photoCount: p.photos.length,
          }))
        }),
    }),



    searchEvents: tool({
      description:
        'Find concerts, festivals, matches and other one-off events happening at the destination. Use this for "what is on while we are there" — it is a different question from attractions, because an event has a fixed date the traveler can miss. The traveler picks what goes into the plan.',
      inputSchema: z.object({
        q: z.string().describe('e.g. "events in Rome" or "concerts in Rome in August"'),
      }),
      execute: async (params) =>
        withToolError(async () => {
          // Anchored the same way as the other searches. An events feed with no city in the query is
          // whatever is on near the provider, which is not where the traveler is going.
          const q = anchorToDestination(params.q, fence.destination)
          const events = await apiSearchEvents({ ...params, q }, deps)
          state.lastPlaces = [...state.lastPlaces, ...events]
          const set: ResultSet = {
            kind: 'places',
            query: q,
            setKey: makeSetKey('places', q, 'event'),
            placeKind: 'event',
            items: events,
          }
          state.pendingResults.push(set)
          return asShown<Place>(set).map((e) => ({
            id: e.id,
            name: e.name,
            date: e.startDate,
            when: e.whenLabel,
            venue: e.venueName,
            address: e.address,
            tickets: e.ticketSellers,
            // Say so plainly: a great event the week after they fly home is no use.
            outsideTripDates: eventOutsideTrip(e, state.trip.meta) || undefined,
          }))
        }),
    }),

    getPlaceDetails: tool({
      description:
        'Fetch reviews and photos for a searched place by id, to enrich its card. Use before recommending so you can cite real pros and cons.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) =>
        withToolError(async () => {
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
        }),
    }),

    getTransferOptions: tool({
      description:
        'How to get between two places — normally the airport and where they are staying. Returns driving, transit, walking and cycling times. Name each end as fully as you can: an airport by its real name ("Tenerife South Airport", not "TFS"), and a stay by its name plus its city, or its street address. A name the map cannot place returns nothing, which is a different thing from there being no way to get there. Ask whether they want airport transfers once a stay is in the plan, and use this to answer with real numbers rather than a guess.',
      inputSchema: z.object({
        from: z.string().describe('e.g. "Turin Airport" or a full address'),
        to: z.string().describe('The accommodation name and city, or a full address'),
      }),
      execute: async ({ from, to }) =>
        withToolError(async () => {
          /*
           * The same resolution path the plan panel uses: each end described several ways from what
           * the plan already holds, then both ends as coordinates. A bare name is a question the map
           * can decline to answer, and an airport is the worst case — Maps stops to ask arrivals or
           * departures, and which terminal, rather than routing. A point has nothing left to ask.
           */
          const { options } = await apiFindTransferRoute(
            journeyCandidates(state.trip, from, to),
            deps,
          )
          // The tool records that the journeys were answered, so the plan can reach its end without
          // depending on the agent remembering to say it did this.
          state.trip = setMeta(state.trip, { transfersReviewed: true })
          /*
           * Spelled out, because the model kept drawing the wrong conclusion from an empty list. An
           * empty answer is a failed lookup far more often than it is a journey with no route, and
           * telling somebody there is no way to get somewhere they can route in one tap is worse
           * than telling them nothing at all.
           */
          if (options.length === 0) {
            return {
              from,
              to,
              options,
              note:
                'No times came back, and every way of naming this journey was already tried — its ' +
                'coordinates included. That is a gap in the directions data, never a journey with no ' +
                'route, so never say there is no way to get there. Say which transport actually works ' +
                'for this hop and reason it from what the plan knows: how far out the stay is, the ' +
                'hour they land or take off, and whether the city has a rail link at all. An airport ' +
                'at 01:00 means a taxi or a booked transfer, not a tram. Then tell them the ' +
                'Directions link on the card opens it, already routed.',
            }
          }
          return { from, to, options }
        }),
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

    suggestReplies: tool({
      description:
        'End your turn by offering 2-4 things the traveler might say next, written in their voice and specific to what you just showed them (e.g. "Somewhere quieter", "Only nonstop", "What about food near there?"). Call this every turn.',
      inputSchema: z.object({
        replies: z
          .array(z.string())
          .min(2)
          .max(4)
          .describe('Short first-person prompts, 2-6 words each'),
      }),
      execute: async ({ replies }) => {
        state.pendingSuggestions.push({ replies })
        return { suggested: replies.length }
      },
    }),

    askTripDetail: tool({
      description:
        'Ask for a concrete trip detail with the right control instead of a typed answer: "dates" ' +
        'opens a calendar, "party" opens rooms/adults/children steppers, "budget" offers rough bands, ' +
        '"destination" and "origin" ask for a place. ALWAYS prefer this over asking in prose when you ' +
        'need one of these — a traveler who has not decided yet has nothing to type, and a calendar is ' +
        'how they work it out. After calling this, STOP and wait for their answer.',
      inputSchema: z.object({
        field: z
          .enum(['destination', 'dates', 'party', 'origin', 'budget'])
          .describe('Which detail you need. One per call.'),
        question: z
          .string()
          .describe('The question in your own voice, e.g. "When were you thinking of going?"'),
      }),
      execute: async ({ field, question }) => {
        state.pendingDetails.push({ field, question })
        return { asked: field }
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
