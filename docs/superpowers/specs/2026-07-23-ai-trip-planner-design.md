# Triperco — AI Trip Planner — Design Spec

**Project name:** Triperco
**Domain:** triperco.com
**Date:** 2026-07-23
**Status:** Approved (brainstorming) — ready for implementation planning

## 1. Summary

**Triperco** (triperco.com) is a responsive web AI trip planner, global in scope, modeled on the value proposition and UX of odessia.com. A guided conversational chat plans a complete trip — flights, stays, and things to do — and renders it live alongside the conversation. There is **no in-app booking**: every item deep-links out to the provider (airline, Booking.com, Airbnb, etc.), which also serves as the revenue model via affiliate links where a program exists. No user accounts in v1; every plan gets a shareable URL that others can open and clone.

The product's edge is **richness and UX**, not inventory — full place details, real photos, and review-based pros/cons that make the plan feel like a complete guide to the trip.

## 2. Goals and non-goals

### Goals (v1)
- Curated, Odessia-style landing page for discovery.
- Guided chat planner with suggestion chips + free-form input.
- Two-zone planner screen: permanent chat + a right pane that toggles Plan ⇄ Map.
- Full trip coverage: flights, hotels + Airbnb stays, things to do / places.
- Rich detail everywhere: photos, ratings, review snippets, full place details.
- Booking via outbound redirect (affiliate-wrapped where available).
- Anonymous, shareable + cloneable trip links.

### Non-goals (explicitly out of scope for v1)
- In-app payment or booking.
- User accounts / login / profiles.
- The "2,000 luxury hotel VIP collection" partnership program.
- Native mobile app.
- Multi-currency / i18n beyond English.
- Real-time price monitoring or alerts.

## 3. Target & platform
- **Market:** Global / general (competes with Odessia on scope).
- **Platform:** Responsive web app (desktop + mobile browser), single codebase.

## 4. Tech stack
- **Framework:** Next.js (App Router).
- **Hosting:** Vercel.
- **UI:** Tailwind CSS + shadcn/ui.
- **AI:** Vercel AI SDK. Primary model **Claude Sonnet 5** for the planner; a cheap/fast model (Claude Haiku or Gemini Flash) for lightweight tasks (intent detection, suggestion chips). Model is swappable by design so Gemini vs Sonnet can be A/B'd on real traffic later.
- **Map rendering:** MapLibre GL with free/open tiles (avoids a second Google billing relationship; place data comes from SearchApi).
- **Data source:** SearchApi.io (see §7).
- **Ephemeral persistence:** Vercel KV (Redis) for caching and for shareable-trip storage. No relational DB in v1.

## 5. Architecture

- **Client:** landing page + planner UI (two-zone, toggle) + MapLibre map.
- **Server (Next.js route handlers / server actions):** the agent loop and **all** SearchApi calls. API keys never reach the browser.
- **Model choice:** primary planner = Claude Sonnet 5 via AI SDK; cheap model for light tasks.

**Data flow:**
```
user message
  → agent (Sonnet + tools)
  → server calls SearchApi (cached)
  → tool results mutate TripState
  → stream chat text + updated TripState
  → itinerary list + map pins re-render
```

### Core architecture decision (chosen)
**Tool-calling agent over a shared `TripState`**, with SearchApi called via thin **server-side REST wrappers** exposed to the model as AI SDK tools.

Rejected alternative: routing the agent through SearchApi's **community MCP server** — it is community-maintained (not vendor-official), adds a deployed moving part, and gives less control over caching/cost. MCP suits agents-in-an-IDE more than a production web app.

## 6. Planner screen (Layout B, toggle variant)

- **Two zones.** Chat left (~36%, **always open**). Right pane (~64%) with a segmented toggle at the top: **📋 Plan** (itinerary cards) or **🗺 Map** (full-pane MapLibre, one pin per itinerary item). One view at a time — never split.
- **Chat:** guided suggestion chips + free-form input; streams prose while tool calls run.
- **Plan view:** flight / stay / day cards with photos, ratings, review snippets, and a running **estimated total**. Each card has an outbound CTA.
- **Map view:** pin per itinerary item; tapping a pin opens a rich popup (photo, rating, review snippet, link).
- **Mobile:** chat primary; a "View plan / map" control exposes the same Plan ⇄ Map toggle as a slide-over.

## 7. SearchApi integration — full coverage

Philosophy: **fetch everything that enriches the experience.** Endpoints mapped to features:

| SearchApi endpoint | Powers |
|---|---|
| Google Flights | Flight options with full detail — times, duration, stops, airline, price, layovers |
| Google Travel / Explore | Destination discovery, "where can I go" inspiration, landing-page + suggestion seeding |
| Google Maps Places | Full place details — address, hours, category, coords, price level, rating count |
| Google Maps Reviews | Review text for "pros *and* cons" concierge summaries |
| Google Maps Photos | Real imagery on every card, map popup, and place detail |
| Google Hotels | Hotel options + prices + details |
| Airbnb | Alternative stays alongside hotels |
| Tripadvisor | Cross-source ratings, reviews, things-to-do |
| Google Maps / Local | Category search near a location (restaurants, attractions) |

### Cost control (essential, not optional)
SearchApi bills per successful search, and breadth of endpoints multiplies cost. Controls:
- **Lazy detail hydration:** summary data (name, price, rating, one photo) on search; full reviews, photo galleries, and deep details only when a card is expanded or the agent explicitly features an item.
- **Aggressive caching** in Vercel KV, keyed by normalized query params: long TTL for places/photos/reviews, short TTL for flights/hotels.
- **Guarded calls:** the agent only searches when it has enough parameters (e.g. no flight search before dates are known); debounce repeated queries.
- **Per-session call budget** to cap runaway agent loops.

## 8. Chat agent

- **Model:** Claude Sonnet 5 (AI SDK).
- **Tools:** `setTripMeta` (destination/dates/travelers/budget), `searchFlights`, `exploreDestinations`, `searchStays` (hotels + Airbnb), `searchPlaces`, `getPlaceDetails` (details + photos + reviews), `addToItinerary`, `removeFromItinerary`.
- **System prompt:** concierge voice — proposes options, surfaces cons as well as pros, suggests hidden gems, adapts to budget/dates.
- **Guardrail:** the agent never invents prices or facts; it only shows what SearchApi returned, and labels prices "as of search — confirm on provider site."

## 9. Landing page

Odessia-style discovery: hero + prompt box, "Featured destinations," "Things to do," "Places we love," "Experiences." v1 uses a **curated/seeded content file** (hand-picked destinations enriched with SearchApi data + imagery, cached) rather than live per-visitor searches — fast and cheap. Clicking a destination pre-seeds the chat (e.g. "Plan 4 days in Rome").

## 10. Data model

```
TripState = {
  id,
  meta: { destination, dates, travelers, budget },
  flights: [ Flight ],
  stays:   [ Stay ],
  days:    [ { date, items: [ ItineraryItem ] } ],
  estimatedTotal
}

Place = {
  id, name, coords, category, rating, reviewCount, priceLevel,
  photos: [], reviewSnippets: [], hours, address,
  sourceLinks: { maps, tripadvisor }
}
```

- Flights and stays carry equivalently rich, fully-detailed objects.
- Lazy fields (full reviews, photo gallery) hydrate on demand.
- `TripState` is serializable and drives both Plan and Map views.

### Sharing / cloning
`POST TripState → Vercel KV → return /trip/{id}`. Opening that URL rehydrates a **read-only** plan; "make your own" clones it into a new editable session.

## 11. Booking redirects

Each flight / stay / place card has a CTA opening the provider in a new tab. A central **`affiliate` module** wraps outbound URLs with affiliate params where a program exists (e.g. Booking.com, flight networks via Travelpayouts) and falls back to plain deep-links otherwise (e.g. Airbnb, whose affiliate program is closed). Centralized so adding a partner later is a one-line change.

## 12. Error handling

- SearchApi failure/timeout → agent responds gracefully, offers retry or adjustment; never a blank card.
- Empty results → "nothing matched — widen dates/budget?"
- Rate/budget limit hit → friendly cap message.
- All provider prices labeled "as of search — confirm on provider site."

## 13. Testing (TDD)

- **Unit:** SearchApi wrappers (mocked HTTP), affiliate URL builder, `TripState` reducer (add/remove/total), share encode/decode.
- **Integration:** agent tools against a mocked SearchApi.
- **E2E (light):** plan-then-share happy path.

## 14. Risks (honest)

- **SearchApi returns scraped Google data** — legally gray for commercial use and can drift from live prices. Redirect + "confirm on site" mitigates the price accuracy issue; the ToS/legal risk is real and should be reviewed before scaling.
- **Per-search cost** scales with usage and endpoint breadth — lazy loading + caching is what keeps it viable.
- **Competing globally** with a funded Odessia — UX quality and content curation are the only edge at v1.
