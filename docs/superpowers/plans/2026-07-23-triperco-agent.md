# Triperco Chat Agent (Gemini) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the conversational planner agent — a Gemini-powered `ToolLoopAgent` (Vercel AI SDK) whose tools call the Plan 2 SearchApi layer and mutate a `TripState` via the Plan 1 reducers — plus a Next.js `/api/chat` route that streams it.

**Architecture:** A per-request `PlannerState` (`{ trip, lastFlights, lastStays, lastPlaces }`) is closed over by a set of AI SDK tools. **Search tools** (`searchFlights/searchHotels/searchPlaces/getPlaceDetails`) call `src/lib/searchapi` and stash results in state. **Mutation tools** (`setTripMeta/addFlight/…/addPlaceToItinerary`) reference those results **by id** and apply Plan 1 reducers — so only real, tool-returned data ever enters the trip (no hallucinated prices). The deterministic core (tools, prompt, model selector) is fully unit-tested with injected deps; the model call and HTTP streaming are thin glue verified by typecheck/build + a real-key smoke test.

**Tech Stack:** `ai` (Vercel AI SDK, `ToolLoopAgent`), `@ai-sdk/google`, `zod`, Next.js route handler. Depends on Plan 1 (`trip/*`) and Plan 2 (`searchapi/*`).

**Scope (Plan 3 of 5):** model selector, system prompt, planner tools, agent factory, `/api/chat` route. **Out of scope:** the chat UI + rendering the itinerary/map (Plan 4), delivering the updated `TripState` to the browser (finalized in Plan 4), real Vercel KV (Plan 5), Airbnb/Tripadvisor/Explore tools (Plan 2b).

**Model decision:** default `@ai-sdk/google` with the user's existing `GOOGLE_GENERATIVE_AI_API_KEY` (easiest setup, per the spec). Model id is read from `GEMINI_MODEL` (default `gemini-2.5-flash`); recommend setting it to the newest flash available on the key (e.g. `gemini-3-flash` / `gemini-3.5-flash`). Swapping to Claude Sonnet later is a one-file change in `src/lib/ai/model.ts` (swap `@ai-sdk/google` → `@ai-sdk/anthropic`).

> **AI SDK version note:** the SDK evolves quickly. This plan uses APIs verified against current docs (`ToolLoopAgent`, `tool({ inputSchema, execute })`, `@ai-sdk/google`, `convertToModelMessages`, `createUIMessageStreamResponse`/`toUIMessageStream`). Two things MUST be confirmed against the just-installed package during Task 1/7 and adjusted if they differ: (a) the agent→`Response` streaming helper (`result.toUIMessageStreamResponse()` vs `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`), and (b) that `ToolLoopAgent` takes `instructions`. Grep `node_modules/ai/docs/` and `node_modules/ai/src/`.

---

## File Structure

```
src/lib/ai/
  model.ts            # plannerModel(): LanguageModel — google(GEMINI_MODEL); one-file swap point
  model.test.ts
  systemPrompt.ts     # buildSystemPrompt(): string — concierge instructions
  systemPrompt.test.ts
  tools.ts            # PlannerState + buildPlannerTools(state, deps) — search + mutation tools
  tools.test.ts
  plannerAgent.ts     # createPlannerAgent({trip,deps,model}) -> { agent, state }
  plannerAgent.test.ts
src/app/api/chat/
  route.ts            # POST { messages, trip } -> streamed agent response
```

---

## Task 1: Install AI SDK dependencies

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install packages**

Run: `npm install ai @ai-sdk/google zod`
Expected: installs with no errors; `ai`, `@ai-sdk/google`, and `zod` appear under `dependencies`.

- [ ] **Step 2: Verify the current agent + streaming APIs against the installed package**

Run:
```bash
ls node_modules/ai/docs 2>/dev/null && grep -rl "ToolLoopAgent" node_modules/ai/docs | head
grep -rn "toUIMessageStreamResponse\|createUIMessageStreamResponse\|toUIMessageStream" node_modules/ai/docs | head
grep -rn "instructions\|stopWhen" node_modules/ai/docs/*agent* 2>/dev/null | head
```
Expected: confirm (a) the class name is `ToolLoopAgent` and it accepts `instructions` + `tools`, and (b) which streaming helper the installed version exposes. **If the installed API differs from this plan, adjust the code in Tasks 6–7 to match the installed docs** (this is expected and correct — the SDK moves fast).

- [ ] **Step 3: Document required env vars**

Create `.env.local.example`:

```bash
# Google Generative AI (Gemini) — used by the planner agent
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
# Optional: pick the Gemini model (default gemini-2.5-flash). Newest flash recommended.
GEMINI_MODEL=gemini-2.5-flash

# SearchApi.io — used by the search tools
SEARCHAPI_API_KEY=your_searchapi_key_here
```

(The real `.env.local` is git-ignored and holds actual keys; tests never need them.)

- [ ] **Step 4: Verify build still passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add AI SDK (ai, @ai-sdk/google, zod) deps"
```

---

## Task 2: Model selector

**Files:**
- Create: `src/lib/ai/model.ts`
- Test: `src/lib/ai/model.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ai/model.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { plannerModel } from './model'

afterEach(() => vi.unstubAllEnvs())

describe('plannerModel', () => {
  it('defaults to a gemini model', () => {
    const model = plannerModel()
    expect(model).toBeTruthy()
    expect(String(model.modelId)).toContain('gemini')
  })

  it('honors the GEMINI_MODEL env override', () => {
    vi.stubEnv('GEMINI_MODEL', 'gemini-3-flash')
    expect(plannerModel().modelId).toBe('gemini-3-flash')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/ai/model.test.ts`
Expected: FAIL — cannot find module `./model`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ai/model.ts`:

```ts
import { google } from '@ai-sdk/google'

/**
 * The planner's language model. Single swap point: to move to Claude Sonnet,
 * replace the import with `@ai-sdk/anthropic` and return `anthropic(id)`.
 * Reads GEMINI_MODEL (default gemini-2.5-flash); needs GOOGLE_GENERATIVE_AI_API_KEY at call time.
 * Return type is inferred (the concrete provider model) so `.modelId` is accessible;
 * it remains assignable to the AI SDK `LanguageModel` type where consumed.
 */
export function plannerModel() {
  const id = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  return google(id)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/ai/model.test.ts`
Expected: PASS (2 tests). If `.modelId` is not the property name in the installed provider, grep `node_modules/@ai-sdk/google` / `node_modules/ai/src` for the model identifier property and update the assertion + any usage.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add planner model selector (Gemini, swappable)"
```

---

## Task 3: System prompt

**Files:**
- Create: `src/lib/ai/systemPrompt.ts`
- Test: `src/lib/ai/systemPrompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ai/systemPrompt.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './systemPrompt'

describe('buildSystemPrompt', () => {
  it('sets the concierge persona and key guardrails', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('Triperco')
    expect(p.toLowerCase()).toContain('concierge')
    expect(p.toLowerCase()).toContain('never invent')
    expect(p.toLowerCase()).toContain('cons')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/ai/systemPrompt.test.ts`
Expected: FAIL — cannot find module `./systemPrompt`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ai/systemPrompt.ts`:

```ts
export function buildSystemPrompt(): string {
  return [
    'You are Triperco, a warm, expert travel concierge who plans complete trips in one conversation.',
    '',
    'How you work:',
    '- Guide the traveler step by step. At each step, offer a few concrete suggestions rather than open questions.',
    '- Use the tools to search real flights, hotels, and places, and to build the trip.',
    '- NEVER invent prices, names, ratings, availability, or links. Only use data returned by the tools.',
    '- Add flights, stays, and places to the trip ONLY via the add* tools, using ids from the most recent search results.',
    '- When recommending, be honest: mention cons as well as pros, and surface hidden gems the traveler might miss.',
    '- Prices are "as of search" — remind the traveler to confirm the final price on the provider site.',
    '',
    'Style: concise and friendly. The itinerary panel shows the full details, so keep chat replies short and focused on the next decision.',
  ].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/ai/systemPrompt.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add planner system prompt"
```

---

## Task 4: Planner tools — state, meta, flights, hotels

**Files:**
- Create: `src/lib/ai/tools.ts`
- Test: `src/lib/ai/tools.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ai/tools.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPlannerTools, createPlannerState } from './tools'
import { createInMemoryCache } from '../searchapi/cache'

// Fake SearchApi deps returning canned raw responses per engine.
function fakeDeps(responses: Record<string, unknown>) {
  const cache = createInMemoryCache()
  const search = async <T>(engine: string): Promise<T> => responses[engine] as T
  return { search, cache }
}

// Tool execute helper — calls a tool's execute with empty options.
function run(tool: any, input: unknown) {
  return tool.execute(input, { toolCallId: 't', messages: [] })
}

describe('setTripMeta', () => {
  it('updates meta on the state trip', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    const res = await run(tools.setTripMeta, { destination: 'Rome', travelers: 2 })
    expect(state.trip.meta.destination).toBe('Rome')
    expect(res.meta.travelers).toBe(2)
  })
})

describe('searchFlights + addFlight', () => {
  it('searches, stashes results, and adds by id', async () => {
    const deps = fakeDeps({
      google_flights: {
        best_flights: [
          {
            price: 180,
            total_duration: 130,
            booking_token: 'F1',
            flights: [
              {
                airline: 'Wizz',
                flight_number: 'W6 1',
                departure_airport: { id: 'SKP', time: '10:00', date: '2026-05-01' },
                arrival_airport: { id: 'FCO', time: '12:10' },
              },
            ],
            layovers: [],
          },
        ],
      },
    })
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)

    const results = await run(tools.searchFlights, {
      departure_id: 'SKP',
      arrival_id: 'FCO',
      outbound_date: '2026-05-01',
    })
    expect(results).toHaveLength(1)
    expect(state.lastFlights).toHaveLength(1)

    const added = await run(tools.addFlight, { id: 'F1' })
    expect(added.added).toBe('F1')
    expect(state.trip.flights).toHaveLength(1)
    expect(state.trip.estimatedTotal).toBe(180)
  })

  it('addFlight returns an error for an unknown id', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    const res = await run(tools.addFlight, { id: 'nope' })
    expect(res.error).toBeTruthy()
    expect(state.trip.flights).toHaveLength(0)
  })
})

describe('searchHotels + addStay', () => {
  it('searches and adds a stay by id', async () => {
    const deps = fakeDeps({
      google_hotels: {
        properties: [
          {
            name: 'Hotel X',
            price_per_night: { extracted_price: 100 },
            rating: 4,
            reviews: 5,
            gps_coordinates: { latitude: 1, longitude: 2 },
            images: [],
            link: 'https://x',
          },
        ],
      },
    })
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)
    await run(tools.searchHotels, {
      q: 'Rome',
      check_in_date: '2026-05-01',
      check_out_date: '2026-05-04',
    })
    const id = state.lastStays[0].id
    const res = await run(tools.addStay, { id })
    expect(res.added).toBe(id)
    expect(state.trip.stays).toHaveLength(1)
    expect(state.trip.estimatedTotal).toBe(300) // 100 * 3 nights
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/ai/tools.test.ts`
Expected: FAIL — cannot find module `./tools`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ai/tools.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/ai/tools.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add planner tools (meta, flights, hotels)"
```

---

## Task 5: Planner tools — places, place details, itinerary

**Files:**
- Modify: `src/lib/ai/tools.ts`
- Test: `src/lib/ai/tools.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/ai/tools.test.ts`:

```ts
describe('searchPlaces + addPlaceToItinerary + getPlaceDetails', () => {
  it('searches places, adds one to a day, and enriches details', async () => {
    const deps = fakeDeps({
      google_maps: {
        local_results: [
          {
            title: 'Colosseum',
            place_id: 'PID1',
            gps_coordinates: { latitude: 41.89, longitude: 12.49 },
            rating: 4.7,
            reviews: 1000,
          },
        ],
      },
      google_maps_reviews: {
        reviews: [{ user: { name: 'A' }, rating: 5, snippet: 'Amazing.' }],
      },
      google_maps_photos: { photos: [{ image: 'https://p/1' }] },
    })
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)

    const places = await run(tools.searchPlaces, { q: 'attractions in Rome', ll: '@41.9,12.5,12z' })
    expect(places[0].id).toBe('PID1')
    expect(state.lastPlaces).toHaveLength(1)

    const added = await run(tools.addPlaceToItinerary, { id: 'PID1', dayIndex: 0 })
    expect(added.added).toBe('Colosseum')
    expect(state.trip.days[0].items[0].placeId).toBe('PID1')

    const details = await run(tools.getPlaceDetails, { id: 'PID1' })
    expect(details.reviews[0].text).toBe('Amazing.')
    expect(details.photos).toEqual(['https://p/1'])
    // enrichment cached on the stashed place
    expect(state.lastPlaces[0].reviewSnippets[0].text).toBe('Amazing.')
  })

  it('removeItineraryItem drops an item from a day', async () => {
    const deps = fakeDeps({
      google_maps: {
        local_results: [{ title: 'X', place_id: 'PIDX', gps_coordinates: { latitude: 1, longitude: 2 } }],
      },
    })
    const state = createPlannerState()
    const tools = buildPlannerTools(state, deps)
    await run(tools.searchPlaces, { q: 'x' })
    await run(tools.addPlaceToItinerary, { id: 'PIDX', dayIndex: 0 })
    const res = await run(tools.removeItineraryItem, { dayIndex: 0, placeId: 'PIDX' })
    expect(res.removed).toBe('PIDX')
    expect(state.trip.days[0].items).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test src/lib/ai/tools.test.ts`
Expected: FAIL — `tools.searchPlaces is not a function` (or similar).

- [ ] **Step 3: Extend the implementation**

In `src/lib/ai/tools.ts`, add these imports to the existing import blocks:

```ts
import type { ItineraryItem } from '../trip/types'
import {
  addItineraryItem as addItineraryItemR,
  removeItineraryItem as removeItineraryItemR,
} from '../trip/tripState'
import {
  searchPlaces as apiSearchPlaces,
  getPlaceReviews as apiGetPlaceReviews,
  getPlacePhotos as apiGetPlacePhotos,
} from '../searchapi/search'
```

Then add these tools to the object returned by `buildPlannerTools` (before the closing `}`):

```ts
    searchPlaces: tool({
      description:
        'Search places/attractions/restaurants near a location. Returns options with ids; add to itinerary only by these ids.',
      inputSchema: z.object({
        q: z.string().describe('What to search, e.g. "top attractions in Rome"'),
        ll: z.string().optional().describe('GPS bias, format "@lat,lng,zoom"'),
      }),
      execute: async (params) => {
        state.lastPlaces = await apiSearchPlaces(params, deps)
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/lib/ai/tools.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add planner tools (places, details, itinerary)"
```

---

## Task 6: Planner agent factory

**Files:**
- Create: `src/lib/ai/plannerAgent.ts`
- Test: `src/lib/ai/plannerAgent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ai/plannerAgent.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createPlannerAgent } from './plannerAgent'
import { createTrip, addFlight } from '../trip/tripState'

describe('createPlannerAgent', () => {
  it('creates an agent and initializes state from the given trip', () => {
    const trip = addFlight(createTrip('t1'), {
      id: 'f1', from: 'A', to: 'B', stops: 0, price: 50, bookUrl: 'https://a',
    })
    const { agent, state } = createPlannerAgent({ trip })
    expect(agent).toBeTruthy()
    expect(state.trip.id).toBe('t1')
    expect(state.trip.flights).toHaveLength(1)
    expect(state.lastFlights).toEqual([])
  })

  it('defaults to a fresh draft trip', () => {
    const { state } = createPlannerAgent()
    expect(state.trip.id).toBe('draft')
    expect(state.trip.flights).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/ai/plannerAgent.test.ts`
Expected: FAIL — cannot find module `./plannerAgent`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ai/plannerAgent.ts`:

```ts
import { ToolLoopAgent, type LanguageModel } from 'ai'
import type { TripState } from '../trip/types'
import type { SearchDeps } from '../searchapi/search'
import { buildSystemPrompt } from './systemPrompt'
import { buildPlannerTools, createPlannerState, type PlannerState } from './tools'
import { plannerModel } from './model'

export interface CreatePlannerAgentOptions {
  trip?: TripState
  deps?: SearchDeps
  model?: LanguageModel
}

/**
 * Builds a planner agent plus the mutable PlannerState its tools operate on.
 * The default ~20-step tool loop (AI SDK default) is plenty for a planning turn.
 */
export function createPlannerAgent(opts: CreatePlannerAgentOptions = {}): {
  agent: ToolLoopAgent
  state: PlannerState
} {
  const state = createPlannerState(opts.trip)
  const agent = new ToolLoopAgent({
    model: opts.model ?? plannerModel(),
    instructions: buildSystemPrompt(),
    tools: buildPlannerTools(state, opts.deps),
  })
  return { agent, state }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/ai/plannerAgent.test.ts`
Expected: PASS (2 tests). If `ToolLoopAgent` construction requires different option names (verified in Task 1), adjust `instructions`/`tools` accordingly.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add planner agent factory"
```

---

## Task 7: Chat API route

**Files:**
- Create: `src/app/api/chat/route.ts`

No unit test (this is thin SDK/HTTP glue that depends on the installed AI SDK version and a live model key; it is verified by typecheck + build here and by the smoke test in Task 8). The tool logic it depends on is already fully tested in Tasks 4–5.

- [ ] **Step 1: Write the route**

Create `src/app/api/chat/route.ts`:

```ts
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { createPlannerAgent } from '@/lib/ai/plannerAgent'
import type { TripState } from '@/lib/trip/types'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, trip }: { messages: UIMessage[]; trip?: TripState } = await req.json()

  const { agent } = createPlannerAgent({ trip })
  const result = agent.stream({ messages: await convertToModelMessages(messages) })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
```

> **Version check (do this now):** confirm against `node_modules/ai/docs` how the installed version turns an agent/stream into a `Response`. If the installed API exposes `result.toUIMessageStreamResponse()`, prefer:
> ```ts
> const result = agent.stream({ messages: await convertToModelMessages(messages) })
> return result.toUIMessageStreamResponse()
> ```
> Use whichever the installed docs show. Also confirm `agent.stream(...)` returns an object exposing `.stream` / `.toUIMessageStreamResponse()`; adjust the call if the method name differs.

> **Note on delivering the updated trip to the browser:** the tools mutate server-side `PlannerState`, but wiring the updated `TripState` back into the UI (via a UI-message data part or a follow-up fetch) is finalized in **Plan 4** with `useChat`. Plan 3 delivers the streaming assistant text and executes the tools; that is its functional boundary.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (Fix any API-name mismatches flagged, per the version check above.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds; `/api/chat` appears in the route list.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add /api/chat streaming route"
```

---

## Task 8: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: PASS — all Plan 1/2/3 suites green.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Clean tree**

Run: `git status`
Expected: nothing to commit.

- [ ] **Step 5 (optional, requires real keys): Smoke-test the agent end to end**

Only if `.env.local` has real `GOOGLE_GENERATIVE_AI_API_KEY` + `SEARCHAPI_API_KEY`. Run `npm run dev`, then in another terminal:

```bash
curl -s http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"Plan 3 days in Rome in May, find me a flight from Skopje and a hotel."}]}]}'
```

Expected: a streamed response; server logs show the agent calling `searchFlights`/`searchHotels`/`searchPlaces`. (Exact request body shape for `UIMessage` may vary by SDK version — adjust to the installed `useChat`/message format. This is a manual confidence check, not a gate.)

---

## Definition of done

- `npm run typecheck`, `npm test`, and `npm run build` all pass.
- `src/lib/ai` exposes a Gemini planner agent whose tools call the Plan 2 SearchApi layer and mutate `TripState` by id (no fabricated data), all unit-tested with injected deps.
- `/api/chat` compiles and streams the agent.
- Model is swappable to Sonnet via `src/lib/ai/model.ts` alone.
- Every task committed.

**Next:** Plan 4 — the Sky Glass planner UI (two-zone layout, Plan⇄Map toggle, glass cards, MapLibre) consuming `/api/chat` with `useChat`, and wiring the updated `TripState` into the right pane.
