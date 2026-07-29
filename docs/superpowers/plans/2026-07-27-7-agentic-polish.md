# Plan 7 — Agentic polish: rich data, clean chat, 70/30 shell

**Date:** 2026-07-27
**Branch:** `feat/7-agentic-polish`
**Goal:** Make Triperco feel like the fastest, most complete way to plan a trip: the chat *is* the
product, details live in components (never in prose), and every option carries enough real data
that the traveler never needs to open another site to decide.

## What's wrong today (end-user view)

1. **Chat prose carries the data.** The model narrates flights/hotels in markdown, so `**Hotel
   Artemide** — $180/night · 4.5★` shows up as literal asterisks. The cards below then repeat it.
2. **Cards and details are thin.** We normalize away almost everything SearchApi returns. A stay
   detail shows photos + "Hotel · 5 nights". No amenities, no review breakdown, no check-in time,
   no address, no what-guests-say. A flight detail shows one time range — no segments, no layovers,
   no aircraft, no baggage hints. So the traveler *does* have to leave the app.
3. **Layout is backwards.** Chat is 36% and the plan is 64%, yet the chat is where everything
   happens.
4. **Not proactive enough.** The agent asks instead of assuming, and doesn't rank ("cheapest",
   "fastest", "best rated") so the traveler has to compare by eye.
5. **No way to start over.** No header, no "new trip", no home link from `/plan`.
6. **No feedback while thinking.** Long searches look like a hang.

## Phases

### 7a — Rich data layer
Carry through everything the SearchApi responses already contain.

- `Flight`: `segments[]` (airline, logo, flightNumber, aircraft, cabin, legroom, from/to airport
  names + times + dates, durationMinutes), `layovers[]` (airport, name, durationMinutes,
  overnight), `carbonKg`, `bookingToken`, `departDate`/`arriveDate`, `extensions[]`.
- `Stay`: `propertyToken`, `kind` (`hotel` | `vacation_rental`), `hotelClass`, `description`,
  `amenities[]`, `excludedAmenities[]`, `address`, `checkInTime`/`checkOutTime`, `totalPrice`,
  `ratingsBreakdown[]` (stars → count), `reviewsBreakdown[]` (topic, positive/negative),
  `nearbyPlaces[]`, `essentialInfo[]`, `dealBadge`, `ecoCertified`, `reviewSnippets[]`.
- `Place`: `phone`, `website`, `description`, `serviceOptions[]`, `priceRange`, `openNow`,
  `hoursByDay[]`, `types[]`.
- `ReviewSnippet`: `date`, `likes`.
- `getStayDetails` tool → `google_hotels` with `property_token`, merging into `lastStays`.
- Every new field is optional; missing data just omits a section (SearchApi payload shape varies
  by property/route).

### 7b — Ranking + badges
`src/lib/ui/rank.ts` — pure `annotateResults(set)`:
- flights: `Cheapest`, `Fastest`, `Nonstop`, `Best value` (price × duration score)
- stays: `Cheapest`, `Best rated` (≥ 25 reviews), `Best value`
- places: `Top rated`, `Most reviewed`
Returns items reordered best-first with a `badges: string[]` sidecar so the domain types stay clean.

### 7c — Chat text hygiene + agentic prompt
- `src/lib/ui/markdown.ts` — `parseChatText(raw)` → blocks (`paragraph` | `bullets`) with inline
  emphasis spans. No literal `**`, `__`, `#`, tables, or link syntax ever renders.
- `MessageText` component renders the blocks.
- System prompt rewrite: assume sensible defaults instead of interrogating; one question max per
  turn and only when it changes a search; never put prices/names/times/ratings in prose; always
  cover flights → stay → things to do → food; run searches without asking permission; end turns
  with a concrete next step.

### 7d — Shell: 70/30, header, quick replies, feedback
- `AppShell` top bar: wordmark → `/`, `New trip` (resets messages + trip + URL), share.
- `/plan` grid → `[1fr_minmax(300px,30%)]` on a wide container; chat left.
- `suggestQuickReplies(trip)` — pure, trip-state-driven tappable next steps, always available.
- Thinking indicator (`Searching…` with animated dots) + result skeletons.
- Auto-scroll to newest message.
- Detail opens as a full-screen modal sheet, so the plan stays put.

### 7e — Rich detail panels
- `FlightDetail`: segment-by-segment timeline with layovers, aircraft, cabin, carbon, price.
- `StayDetail`: gallery, rating breakdown bars, review topics, amenities grid, check-in/out,
  address, nearby, essential info, guest reviews.
- `PlaceDetail`: hours by day, open-now, phone, website, price range, service options, reviews.
- Cards: badges, key facts, rating, per-night + total.

### 7f — Plan pane density
- Compact timeline that reads well at 30% width; trip context chips move into the plan header
  (chat stays pure conversation); total breakdown (flights / stays / per traveler).

## Verification
`npm test` (44 → ~70 files), `npm run typecheck`, `npm run build` after every phase.
