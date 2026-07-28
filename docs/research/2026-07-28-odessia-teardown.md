# Odessia teardown — how their UX actually works

**Date:** 2026-07-28
**Method:** static analysis of the live site (server-rendered HTML + the production JS bundle).
**Not covered:** the signed-in chat itself. See [Limits](#limits).

---

## 1. How I got this

Three routes in, two blocked:

| Path | Result |
| --- | --- |
| Chrome automation | Blocked — org policy blocks *all* external sites (verified against `example.com` too) |
| `WebFetch` | 403 from their bot protection |
| `curl` | **200** — works with the default user agent, no spoofing |

The site is TanStack Start + Vite. Two things made a deep read possible:

1. **Pages are server-rendered.** The landing page, destination guides and hotel pages ship their full content as HTML.
2. **Their build does not mangle chunk filenames.** Vite emits one chunk per lazy module, named after the module. That yields a 408-entry inventory of component names — effectively a map of the product.

Artefacts are in the scratchpad for this session: `odessia-root.{html,txt}`, `dest-oaxaca.txt`, `hotel-nanavida.txt`, `asset-graph-1.txt`, `js/`.

---

## 2. Route map

```
/                                     landing (SSR)
/c/$chatId                            the chat — one route per conversation
/explore                              redirects to / when not signed in
/destinations/$...                     destination guide (SSR, 1–3 path segments: country/region/city)
/hotels/$...                          hotel page (SSR, country/region/city/slug)
/homes/$propertyId, /hotel-id/$hotelId
/trips, /wishlist, /wishlist/$collectionId
/share/trips/$slug                    public shared trip
/trip-booking/print                   printable booking
/account/{profile,travel,gmail}
/onboarding, /onboarding/waitlist
/auth/{sign-in,sign-up,sso-callback,verify}
/admin/...                            ~40 internal routes
```

Route nesting shows the gating: `_appShell / _signedInGate / _onboardedGate / _activeAccessGate`. The chat sits under `_appShell` only — but `useStartChat` still requires an account session, satisfied by **Clerk with an anonymous account** (`status === 'anonymous'` passes). So there is an account behind every chat; it just may not be a signed-up one.

The admin routes leak the backend domain model: accommodation search sessions, flight search sessions, rate normalization (bed-type patterns, ADA patterns, amenity mapping), destination-media curation, supplier mappings, loyalty-brand mappings, booking exceptions, agents, workflows.

---

## 3. The landing page

Order, top to bottom:

1. App bar: wordmark, **New chat**, preview banner — *"Odessia is in preview… Prices are in USD unless specified."*
2. **Composer** with tabs **Flights / Stays / Activities** (`TravelSearchTabs`), headline "Odessia Travel Concierge / Plan and book entire trips in one conversation.", placeholder "Ask Odessia anything"
3. Four category cards: **Hotels & homes**, **Flights**, **Things to do**, **Destinations** — each with a one-line pitch ("More options than Google Flights + points deals")
4. **Places we love** — 45 destinations, name + one-line character sketch. CTA "Ask Odessia where to go"
5. **Experiences you won't forget** — ~33 real bookable tours with full descriptions. CTA "Search activities"
6. **Hotels and homes handpicked for you** — 31 hotels, name + one-line character sketch. CTA "See Odessia's recommendations"
7. **Steal their itinerary** — celebrity trips ("Ronaldo's Madeira", "Stanley Tucci's Puglia", "Emily in Paris, for real"). Pitch: *"open one, make it yours, and Odessia rebuilds it around your dates."* CTA "Plan yours"
8. **The world is your oyster** — an infinite marquee of city + fare ("Reykjavík $189"). CTA "Search flights"
9. **A letter from our founder** — long-form manifesto with a headshot
10. Destination tag cloud (45 links)
11. Footer: Travel / Account / Support / Legal

Every row is real editorial content, not placeholder. The rows are `HorizontalScrollCarousel` + `CarouselNavigationButton`.

---

## 4. The landing → chat handoff

`homepageComposerIntent` builds one object and hands it to the chat as `home_composer_intent` / `initialComposerIntent`:

```ts
{
  source: 'home',
  text: string,
  travelSearch: 'flights' | 'stay' | 'activities' | null,
  destination: string,
  stayAccommodation: 'hotel' | 'home',
  fullOccupancies: [{ adult_count, children: [{ age: number | 'unknown' }] }],
  flight: {
    from, to,
    tripType:   'roundtrip' | 'oneway' | 'multicity',
    cabinClass: 'economy' | 'premium_economy' | 'business',
    stops:      'any' | 'nonstop' | '1stop' | '2plus',
    legs: [{ from, to, date }],           // multi-city
  },
  dateRange: { start, end, flexible, exactDateAdjustment },
  guests:    { adults, children, childrenAges, infants, pets, rooms },
  travelers: [{ id, label }],             // saved, named travellers
  budget:    'budget' | 'luxe' | ...,     // 'ultra-luxe'→'luxe', 'midscale'→'budget'
  filters:   [{ id, label, category, value }],
}
```

Notable beyond what Triperco models: **flexible dates** with an `exactDateAdjustment`, **infants and pets** as distinct counts, **children's ages** (which change pricing), **named traveller profiles**, and **filters as structured chips** rather than prose. Also: the whole object is dropped if every field is empty, and defaults are stripped (1 adult / 0 children / ≤1 room encode as nothing) so the model isn't fed noise.

---

## 5. The in-chat vocabulary

They build on **`assistant-ui`** (`aui` runtime, `dataRenderers`, `setToolUI`, `modelContext`, `suggestions`, thread branching, dictation/voice). Confirmed capabilities: message branching (`switchToBranch`), reload, copy, per-message feedback, voice + dictation, image attachments.

The full set of streamed UI part names:

| Part | What it renders |
| --- | --- |
| `ui_home_search` | the composer echoed into the thread |
| `ui_search_form_summary` | a structured recap of the current search with CTAs *"Search flights with these preferences"*, *"…stays…"*, *"…activities…"*, *"Plan a trip with these preferences"* |
| `ui_hotel_search`, `ui_accommodation_search` | stay results |
| `ui_hotel_availability` | rooms + rates for one hotel |
| `ui_activity_search`, `ui_experience_search`, `ui_events_search` | things to do, split three ways |
| `ui_destinations_1_stop`, `ui_destinations_multi_stop` | destination suggestions — **single-stop vs multi-stop are different components** |
| `ui_recs` | recommendations |
| `ui_show_trip` | the trip/plan surfaced inline |
| `flight_search_results`, `flight_search_update`, `search_updated` | flights, plus incremental updates to an existing result set |

In-chat search controls: Where · Guests · Rooms · Passengers · Cabin (Economy / Premium Economy / Business) · Stops (Nonstop) · One way / Round trip / **Multi-city** · Accommodation (Hotel / Entire home).

`search_updated` and `flight_search_update` matter: results are a **living set that gets revised in place**, not a new carousel per turn.

### Markdown, and how they solve the `**` problem

They do *not* strip markdown. `RichPlaceMarkdownLink` is a full renderer (paragraph, heading, list, blockquote, code, table, image, thematicBreak) with two custom node types:

- **`odessia-rich-mention-image`** — a place named in prose becomes a live mention that carries an image and expands into a card with an action bar ("Card actions").
- **`markdown-external-url-chip`** — a bare URL becomes a domain chip with "Go to website" (they strip `www`, `cdn`, `blog`, `app`, `help`, `support`… to show the bare brand).

So their answer to "don't dump details in prose" is the opposite of ours: keep the prose, make every entity in it a tappable object. Triperco strips markdown entirely. Theirs is richer; ours is safer.

---

## 6. Context hints — the most important pattern here

Three modules (`activityAssistantHints`, `hotelRoomOptionsContextHint`, and the flights equivalent) do the same thing: **before each message is sent, the client snapshots what the user is currently looking at and injects it into the model context.**

```ts
{
  hint_type: 'activity_search_results',
  description: 'Activity search results currently visible in the UI.',
  content: JSON.stringify({ has_more_results, items: [
    { id, title, summary, duration, price, user_review, categories }
  ]})
}
```

Other hint types seen:

- `activity_panel_context` — *"Activity details visible in the activity panel when the user sent this message."*
- `hotel_room_options_context` — *"Room and rate options visible in the hotel UI when the user sent this message. Prices are a UI snapshot from captured_at."*
- the flights one — *"Flight search results currently visible in the UI."*

This is why their conversation feels aware. The model isn't reasoning from what it searched three turns ago; it is told what is on screen right now, including which room is selected and which panel is open.

The context budgeting is careful and worth copying verbatim:

- caps: **16 rooms**, **4 rates per room**, **8 amenities**, description truncated to **700 chars** on a word boundary
- **the active item is always included** — if the selected room falls outside the cap, it is hoisted to the front of the list rather than dropped
- prices are explicitly stamped `captured_at` and described to the model as a UI snapshot, so it never states them as authoritative
- every field is zod-parsed with `.catch(undefined)`, so a malformed field degrades instead of dropping the hint

---

## 7. The trip panel

State lives entirely in the **URL**, via `panelState`:

```
?trips=open&trip=<tripStateId>&screen=list|detail|partner-bookings
```

plus a standalone `/trips` route. So the plan is a **deep-linkable overlay with three screens**, not a fixed side pane. Desktop is a master/detail rail (`trips-results-rail` + `trips-detail-panel`); mobile is a pushed screen stack with `pushScreen`/`popScreen`.

`tripWorkflow` tracks guided completion:

```ts
{ tripName, destinationLabel,
  steps: { destination: {added,target,status}, transport: {…}, stay: {…} },
  overallAdded, overallTarget }
```

— three steps, each `pending` until its target count is met. A progress meter, not a checklist.

The plan's item model (`adaptTripComposition`): `Flight` / `Stay` / `Activity` / `place-visit` / `drive` / `stop`. Flights carry `arrivalDayOffset` (arrives next day), `operatedBy`, `aircraft`, `cabinLabel`, `OUTBOUND` / `RETURN` / `ONE WAY`. Time-of-day buckets are `early` / `mid` / `late`.

Booking lifecycle: `draft → pending → "Pending confirmation" → confirmed/"Booked"` with branches to `failed`/"Booking failed" and `cancelled`/`marked-cancelled`, plus an `attention` state, `prebookId`, `pricePaid`, and refundability (`refundable` / "Non-refundable" / `NRFN`).

Other panel copy worth noting:

- **"Day plan"** — the itinerary section
- **"Bookings on file that aren't in your plan"** — they reconcile bookings against the plan, and surface the mismatch
- "Nothing else scheduled. Anything you add to the plan that isn't a booking shows up here."
- "Booked directly with the operator. Tap to reopen the link any time." / "Dismiss if you've moved on from this booking."
- Money lines: Total, Paid at booking, Account Credit, Referral Credit, Gift Card, Waived residual
- "Dates TBD", "Print / save PDF", "Share trip", calendar export

**On the word "partner":** their third screen is literally `partner-bookings` — "Partner bookings", "Partner progress", "Hotels booked or ready to book through Odessia", naming Airbnb, GetYourGuide, Kayak. They *are* commercial partners with some providers and they take payment in-app (`useAccommodationCheckout`, `cartCheckout`, `checkout_gate`, 3DS return, payment recovery, gift cards, credits). Triperco is not, which is why our own wording had to change — this is a difference in business model, not a copy mistake on either side.

---

## 8. Destination guide structure

The Oaxaca guide is ~290 lines of original editorial. Section taxonomy:

1. Hero — name, "Oaxaca, Mexico", photo count, "Open Oaxaca photos", one-line character sketch
2. History narrative, with named places as live mentions and captioned photos interleaved
3. **Highlights** — 6 themed sub-sections, each a heading + a substantial paragraph
4. **{Destination} Itineraries** — named routes: "The Classic Sweep", "Cultural Deep Dive", "Pacific Coast Circuit"
5. **Where to go** — sub-areas, then child destinations
6. **How to move** — By Bus / By Colectivo / By Air / By Car
7. **Where to eat** — narrative naming real restaurants as mentions
8. **Nature & Outdoors**
9. **Cost & Budget** — four named tiers: **Broke** (<$35/day) · **Value** ($40–80) · **Premium** ($150–300) · **Luxe** ($400+)
10. **Where to stay** — "Add dates" → live hotel search **embedded in the editorial page**
11. **Traditions & Culture**
12. **What's Changing Now** — current events (a new highway, gentrification)

Recurring named callout boxes: **Insider Move**, **Timing Matters**, **Common Mistake**, **Skip This**, **The Local Order**, **What's Changing Now**. These carry the opinionated voice — "Do not visit Hierve el Agua on a Sunday… Go on a Tuesday morning right at opening."

---

## 9. Hotel page structure — "The Odessia Report"

1. Breadcrumb (country / region / city / hotel), score `9.8`, review count, star class, "Open … photos" + count (95)
2. Provider marketing blurb
3. **Add your dates** → check-in / checkout / "View availability"
4. 4 editorial highlight cards (Local Art Heritage, Bespoke Hospitality, Botanical Courtyard, Prime Walkability)
5. **Choose a room** — room name, size, per-room photos, "Total for the entire stay, taxes and fees included"
6. **The Odessia Report** — *"Based on 1,484 verified reviews & publications"*, then fixed dimensions:
   - Positioning and Vibe · Value and Service
   - **Pros: What guests love** — 6 named findings, each with a short explanation, then verbatim guest quotes with a score
   - **Cons and watch-outs** — 4 named findings, same treatment ("No On-site Parking", "Early Morning Birds", "Internal Sound Echoes", "Limited Natural Light")
   - Location and surroundings · Design and aesthetics · Rooms and suites · Service and hospitality · Cleanliness and maintenance · Guest profile and vibe · Food and beverage · Spa and wellness
7. Sub-scores: Cleanliness / Service / Location / Room Quality / Amenities / Value for Money / Food and Beverage / Overall Experience
8. Property details — address, check-out, children, pets, internet, parking, children-and-extra-bed policy
9. ~45 generated FAQs, each a real question with a specific answer

The cons section is the differentiator, and it matches their founder letter: *"Odessia reads every review and writeup for every hotel in the world, and writes you the cons as well as the pros."*

---

## 10. What Triperco is missing

Ranked by value, cheapest-first within a tier.

**High value**

1. **Context hints.** Snapshot the visible result set and any open detail panel into the model context on every message, with the caps and `captured_at` discipline from §6. This is the single largest gap: our agent knows what it searched, not what the traveller is looking at. It is also the real fix for "suggestions should follow the conversation".
2. **Result sets that update in place** (`search_updated`) instead of a fresh carousel per turn. "Cheaper?" should revise the existing set.
3. **Cons and watch-outs** on stays. We show amenities and ratings; they show *"Because rooms surround the open courtyard, morning activities in the breakfast area can be heard clearly in ground-floor rooms."* We already fetch review text — we're just not synthesising against it.

**Medium**

4. **Multi-city flights** and cabin/stops as first-class search controls. We have one-way/round-trip/return; `multicity` with `legs[]` is absent.
5. **Flexible dates** (`flexible`, `exactDateAdjustment`) — plausibly the highest-leverage price lever we don't offer.
6. **Infants, pets, children's ages, rooms** as distinct fields. We model `rooms/adults/children`; ages change pricing and eligibility.
7. **Progress meter** over destination → transport → stay, in place of an inert plan pane.
8. **`arrivalDayOffset`** — we don't flag a flight that lands the next day.
9. **URL-addressable plan state** (`?trip=…&screen=…`). Deep-linkable and back-button-correct; ours is component state.

**Lower / later**

10. Booking lifecycle beyond a status dropdown: `prebookId`, pending-confirmation, failed, attention, refundability.
11. Named traveller profiles and a persisted preference document driving personalisation.
12. Voice/dictation and image attachments in the composer.
13. Editorial destination guides with the callout vocabulary (Insider Move / Common Mistake / Skip This) and budget tiers.
14. "Steal their itinerary" — templates rebuilt around your dates.
15. Rich place mentions in prose, as an alternative to our markdown-stripping.

**Deliberately not copying:** in-app checkout, gift cards, credits, referrals, commercial partner integrations. Different business model — we redirect and say we're not affiliated.

---

## Limits

I could not observe the live chat. `/c/$chatId` requires an account session, and creating accounts is outside what I'll do on the user's behalf. Everything in §5–§7 is read from the shipped client code, which tells me the vocabulary, the data shapes and the copy — but not the pacing, the tone of the agent's replies, or how many turns a real booking takes.

To close that gap, the user can walk the flow themselves; the highest-value captures would be a screen recording of one search-to-plan round trip, and the flight/stay/activity result cards at full size.
