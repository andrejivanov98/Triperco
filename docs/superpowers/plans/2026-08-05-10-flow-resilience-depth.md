# Plan 10 — Resilience, guided flow, and depth of options

Baseline before any change: **628 tests / 85 files green, `tsc --noEmit` clean.**

The app is live. Every phase below is additive: no existing prop, tool, type or exported function
changes meaning. Where a name is load-bearing (`ActivityKind.attraction`, `ResultSet.placeKind`
fallbacks in `results.ts`) it keeps its name and gains a new sibling rather than being renamed.

---

## 10A — Resilience: the chat never dead-ends

Found during investigation, all real:

| Issue | Where | Effect today |
| --- | --- | --- |
| No `onError` on the UI message stream | `api/chat/route.ts:32` | A model failure gives the traveler a silently dead stream |
| Agent turn not wrapped | `api/chat/route.ts:34` | A throw mid-turn aborts everything already streamed |
| `getPlaceDetails` not wrapped in `withToolError` | `lib/ai/tools.ts:386` | Throws reach the model as a bare "An error occurred" |
| Fenced code blocks not stripped | `lib/ui/chatText.ts` | ` ``` ` blocks and raw JSON render as literal prose |
| No provider retry | `lib/searchapi/client.ts` | A single 5xx or timeout loses the whole search |
| 429 indistinguishable from other failures | `lib/searchapi/client.ts:59` | The agent can't tell "slow down" from "bad parameters" |

Three layers, because a streamed turn fails at three different moments.

1. **Render layer** — `lib/ui/chatText.ts` becomes fence-aware. Fenced blocks are dropped whole;
   lines that look like raw JSON, a function call, or an XML-ish tag are dropped. Runs per token
   while streaming, so code never appears even for one frame.
2. **Turn layer** — `api/chat/route.ts` gains `onError` (traveler-safe sentence, never a stack) and
   wraps the agent turn: on a throw, one retry with a corrective nudge; if that also fails, a short
   human line plus tappable next steps so the thread continues.
3. **Quality layer** — in `onFinish`, a turn that produced no prose *and* no cards/options/forms gets
   one non-streaming repair call. Safe by construction: nothing was shown, so nothing is contradicted.

Also: `getPlaceDetails` wrapped; `client.ts` gains one bounded retry on 5xx/timeout with 429 surfaced
as its own message.

**Security note.** No secret ever reaches the traveler: `onError` returns a fixed string and the
provider's own text is only ever passed back to the *model*, never rendered. `client.ts` already
sends the key as a Bearer header, never in a logged URL.

## 10B — Guided flow: visible, and mood-aware

`suggestReplies` is a tool the prompt demands **every turn**; it writes `data-suggestions`,
`getSuggestions()` reads them, and nothing renders them. `suggestQuickReplies(trip)` is computed in
`PlannerScreen.tsx:199` and passed to a prop documented "no longer rendered". Both mechanisms are
dead weight today.

- New `SuggestionChips`, rendered under each assistant message. Agent suggestions win; when the tool
  wasn't called, `suggestQuickReplies(trip)` fills in, so there is always a next move.
- `TripMeta` gains `pace` (`fast` | `explore` | `detailed`) and `vibe` (`relaxed`, `foodie`,
  `culture`, `nightlife`, `family`, `adventure`, `budget`, `luxury`). `setTripMeta` records them.
- System prompt restructured. The current contradiction — "Open every new trip with presentOptions,
  then stop and wait" vs. "Never ask permission to search. Search, then report." — resolves: the
  opening menu appears only when the request is genuinely broad. Route + dates + stated intent means
  search now. Pace steers how much it asks. A new rule forbids code, JSON and tables in prose.

## 10C — Guided form interface

The traveler is often not decisive in the moment, and this is a planning app. Asking in prose when a
control would do is the main reason the flow feels like an interrogation.

`DateRangePicker` and `GuestPicker` already exist for the landing composer and are pure
presentational components over `lib/ui/calendar.ts` and `lib/ui/guests.ts` — they drop straight into
a `GuidedCard` in the chat.

New tool `askTripDetail({ field, question })` where `field` is `dates` | `party` | `origin` |
`budget`. Each renders the right control inline in the thread and submits as a normal message, so
the existing turn machinery is untouched:

- `dates` → month calendar with range selection, past dates already unselectable
- `party` → rooms / adults / children steppers
- `origin` → short text with a "where do you fly from" affordance
- `budget` → a few tappable bands plus free entry

The prompt is told to prefer this over asking in prose whenever a real control exists.

## 10D — Depth: at least 10 options, ordered by what matters

- `rank.ts`: `MAX_CARDS` 8 → **10**; `rankResults` takes an optional limit.
- Explicit lead order, replacing today's "best value, then any badged, then provider order":
  **Best value → Cheapest → Most reviewed / Best rated → the rest.**
- A trailing "Show all N" card expands the carousel in place; a "Search deeper" chip asks the agent
  for a genuinely wider search.
- Tools report 12 options to the model plus a `has_more` count.
- `ROUND_TRIP_PAIRS` 4 → **10** (`search.ts:166`). A round-trip search cannot return more options
  than the pair count, so 4 capped every round-trip result set at four cards. Ten concurrent calls,
  cached 15 minutes.

No provider pagination: a hotels or maps search already returns ~20 results and we discard more than
half, so "show all" reaches 20+ without one extra call. `next_page_token` behaviour is unverified
against the live provider and stays out.

## 10E — Four buckets, with real data on the cards

- `attraction` keeps its name (load-bearing in `results.ts` fallbacks and existing threads) and
  relabels to **Places to visit**. New `activity` kind carries **Things to do**.
- Classification by category patterns: museum, monument, park, viewpoint, gallery, castle, ruins →
  visit; restaurant, bar, spa, beach, class, market, nightlife, water park, diving → do. Tours and
  events are untouched.
- `normalizePlaces` keeps **all** photos (it currently keeps `thumbnail` and discards `images`).
- Top 3 places per search get photos and reviews fetched concurrently at search time.
  `/api/places/details` grows a batch form (`placeIds`, max 6) so the carousel enriches the rest as
  they scroll into view. The single-`placeId` form keeps working.
- `PlaceResultCard` gains a photo strip and a real review quote beside the rating, hours and area it
  already shows.

## Deliberately not doing

- Provider pagination (`next_page_token`) — unverified against the live provider.
- A filterable full-screen results grid — more surface area than the expand-in-place control earns.
- Distance-from-your-stay on activity cards.
- Food as a fifth bucket; restaurants live in "Things to do".

## Verification

Every new unit gets vitest coverage. `npx vitest run`, `tsc --noEmit` and `next build` must all be
green, with the 628 baseline tests still passing.

---

## Status — all phases shipped

628 → **761 tests / 91 files**, `tsc --noEmit` clean, `next build` clean.

| Phase | What landed |
| --- | --- |
| 10A | Fence-aware parsing, `onError` + one turn retry, empty-turn repair, `getPlaceDetails` wrapped, provider retry with 429 split out |
| 10B | `SuggestionChips` rendered, `pace`/`vibe` on the trip, prompt restructured |
| 10C | `askTripDetail` + `DetailForm` (calendar, steppers, budget bands, origin) |
| 10D | 10 cards, `BADGE_PRIORITY`, expand-in-place, `ROUND_TRIP_PAIRS` 4 → 10 |
| 10E | Four buckets, all photos kept, shared enrichment budget, richer place cards |

### Deviations worth knowing

- **`ROUND_TRIP_PAIRS` is 10, not the 6 the Balanced budget implied.** A round-trip search cannot
  return more options than the pair count, and "at least 10 options" was the headline requirement.
  Ten concurrent calls per round-trip search, cached 15 minutes. One constant to change.
- **Enrichment is a shared budget of 4, not 3 per bucket.** A place search now splits four ways, so
  per-bucket would have been 24 provider calls for one question. `allocateEnrichment` spends the
  budget round-robin, so every carousel's leading card is complete — that is the one that gets read.
- **`Most reviewed` was missing from stays entirely.** Only places had it. Added, since review weight
  was asked for as a lead signal.
- **`MAX_ITEMS` in `contextHints` now reads from `MAX_CARDS`** rather than repeating it. The two had
  already drifted (8 vs 8 by luck), and a drift means "the second one" stops matching the screen.
- **`showsOpeningHours` now covers `activity` too.** A restaurant closes exactly like a museum; with
  the new bucket the old `attraction`-only check would have hidden hours from everywhere you eat.
- **Tool results stayed arrays** rather than gaining a `has_more` envelope, to avoid changing a shape
  existing tests assert. They are now ordered by `rankResults`, so "the first one" means the same
  thing to the agent and the traveler; `has_more_results` still reaches the agent via context hints
  on the following turn.
- **A mid-stream model failure gets the calm sentence, not the retry.** The retry covers a turn that
  fails to start. Once tokens are streaming, retrying would duplicate what is already on screen.
