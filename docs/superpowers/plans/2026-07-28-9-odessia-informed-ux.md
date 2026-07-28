# Plan 9 — Odessia-informed UX improvements

**Branch:** `feat/9-odessia-informed-ux` (off `feat/8-odessia-parity`)
**Source:** `docs/research/2026-07-28-odessia-teardown.md` + `-interpretation.md`
**Principle:** adopt what makes their agent *aware*; keep the structural choices we made on purpose.

Every phase ships with tests, `tsc --noEmit` clean, a clean production build, and one commit.

---

## 9A — Context hints (highest value)

**The problem it fixes.** Our agent knows what it searched; it does not know what the traveller
is looking at. So "the second one", "is that one quieter?", "the cheaper room" force it to ask,
and asking makes it feel like a form.

**Shape.** A new pure module `src/lib/ui/contextHints.ts`:

```ts
export interface ContextHint {
  hintType: 'stay_results' | 'flight_results' | 'place_results'
           | 'stay_detail' | 'place_detail'
  description: string   // plain English, aimed at the model
  content: string       // JSON, capped
  capturedAt: string
}
```

Rules taken directly from their implementation:

- **Caps:** 12 items per result set, 8 amenities, descriptions truncated to 700 chars on a word
  boundary. Cheap fields only — no photo arrays, no full review bodies.
- **Hoist the active item.** If the opened stay/place falls outside the cap, move it to the
  front rather than dropping it. The thing the user clicked is the thing they're talking about.
- **Stamp `capturedAt`** and say so in `description` ("prices are a UI snapshot from
  capturedAt"), so the agent never quotes a stale price as fact.
- **Per-field tolerance.** Each field falls back to omitted rather than failing the hint.

**Wiring.** `PlannerScreen` builds hints from the currently rendered `ResultSet[]` plus any open
`DetailPanel`, and sends them in the `useChat` request body. `/api/chat` appends them to the
agent's context as a system-role block. No new agent tools.

**Tests:** caps, hoisting, truncation on word boundary, malformed-field degradation, empty case
emits nothing, and an integration test that the send path includes hints when a panel is open.

---

## 9B — Result sets revise in place

**The problem.** Every refinement appends a new carousel. Six turns in, the chat is sediment and
the traveller scrolls past four stale sets to reach the live one.

**Shape.** Give each `ResultSet` a `setKey` derived from its search parameters (kind + normalized
destination + dates + party). When a new set arrives with a `setKey` that already exists in the
thread, **replace it in place** and mark it revised ("updated for 2 rooms") rather than appending.
A `supersededBy` field keeps the old one collapsible rather than deleted, so history isn't lost.

**Tests:** same key replaces, different key appends, revision label renders, superseded set
collapses, and ordering is stable.

---

## 9C — Cons and watch-outs on stays

**The problem.** We rank and badge; they characterise and criticise. We already fetch review text
via `google_hotels_property` and synthesise nothing from it.

**Shape.** Extend the stay-detail path to derive a short **Pros / Cons** block from review
material we already have — each finding a short title plus one grounded sentence, and where a
verbatim quote supports it, the quote. Never invent a con: if the material doesn't support one,
render nothing. No reviewer names (PII) — quotes only, unattributed.

**Tests:** derives from real fixture payloads, emits nothing when material is thin, never
fabricates, no personal names in output.

---

## 9D — "Things to do" splits three ways

**The problem.** We flatten bookable tours, loose recommendations and date-anchored events into
one card, which loses what makes each actionable — and it's why days feel either rigid or empty.

**Shape.** `Place` gains a `activityKind: 'attraction' | 'tour' | 'event'`. Tours carry ticket
categories (adult / child / group), `pricingUnit`, `maxGroupSize`; events carry a date and are
flagged when they fall outside the trip window. Cards differ by kind; the carousel header names
the kind. Activities stay unassigned to days — availability lives on the item, not the calendar.

**Tests:** classification from provider fields, event-outside-window flagging, group pricing
maths, and unchanged behaviour for plain attractions.

---

## 9E — Search depth

Additive fields, each with its own tests:

- **Flexible dates** — `flexible` + `exactDateAdjustment` (±N days). Plausibly the biggest price
  lever we don't offer.
- **Multi-city** — `legs[]` on the flight search, alongside existing one-way/round-trip/return.
- **Cabin and stops** as first-class controls (economy / premium economy / business; nonstop /
  1 stop / 2+).
- **Party detail** — infants and pets as distinct counts, children's ages (they change pricing
  and eligibility).

---

## 9F — Fidelity and orientation

- **`arrivalDayOffset`** — flag a flight that lands the next day. We currently show a date and
  let the traveller work it out.
- **Flight detail** — `operatedBy`, aircraft, cabin label where the provider gives them.
- **Progress meter** — `destination → transport → stay`, added/target per step, replacing the
  plan pane's inert empty state with something that says what's missing.
- **URL-addressable plan state** — `?trip=…&panel=…` so the plan is deep-linkable and the back
  button behaves.

---

## Deliberately NOT doing

- **In-app checkout, credits, gift cards, partner integrations.** Different business model. We
  redirect and state we're not affiliated.
- **Reviewer names and any personal data** from provider payloads.
- **Bulk LLM-generated destination guides.** Their scale advantage; our liability if wrong.

## Reversals — decided

1. **Plan as a summonable overlay** — **adopted**, shipped as 9G. The fixed 70/30 split is gone;
   the chat owns the width and the plan is a deep-linkable drawer with a count on its button.
2. **Rich place mentions in chat prose** — **declined**. Chat stays markdown-free and
   conversation-only, as originally specified.

## Status — all phases shipped

| Phase | Commit | Notes |
| --- | --- | --- |
| 9A | `718343d` | Context hints |
| 9B | `736f820` | Sets revise; superseded ones collapse |
| 9C | `b2aa4a8` | Cons and watch-outs; reviewer names removed |
| 9D | `eabdc9a` | Attractions / tours / events, `google_events` verified live |
| 9E | `72e85e6` | Cabin, stops, multi-city, flexible dates, real party |
| 9F | `65e3fb2` | `+1 day` arrivals, progress meter |
| 9G | `32cc049` | Plan overlay |

410 → 530 tests. Typecheck and production build clean.

### Deviations worth knowing

- **9B "replace in place"** became *collapse the superseded set*. Teleporting new results into an
  older message's position would be disorienting; the new set lands where the eye already is and
  the old one collapses to one reopenable line. Same goal — no sediment — without the jump.
- **9C** grounds findings in provider counts plus a verbatim quote rather than writing prose. We
  have no way to characterise a hotel without inventing, and inventing is the one thing that would
  destroy the value of a cons section.
- **9E flexible dates** are a genuinely wider search (up to 3 provider calls), because the provider
  has no flexible-date flag. Capped, and the tool description tells the agent it costs extra.
- **9G** back-button does not close the drawer. Local state stays authoritative so the drawer never
  flickers while the router catches up; deep links in still work.
