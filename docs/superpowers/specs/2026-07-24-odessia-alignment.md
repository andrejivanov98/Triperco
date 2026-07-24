# Triperco — Odessia Flow Alignment — Design Spec (Revision)

**Project:** Triperco (triperco.com)
**Date:** 2026-07-24
**Status:** Approved direction — ready for phased planning
**Supersedes/extends:** `2026-07-23-ai-trip-planner-design.md` (esp. §15 Sky Glass, and the planner-UI sections)

## 1. Why this revision

v1 is built and merged (chat + tools + map + share + landing). Testing against the real
odessia.com flow shows our **data layer and redirect model already match** — SearchApi normalizers
capture photos, ratings, reviews, hours. The gap is **presentation and flow**:

- Search results are **never surfaced in chat** (only already-added items show, as 1-line rows).
- There are **no detail views** (Odessia has rich gallery / amenities / host / reviews / location / availability).
- The right pane is a **flat list**, not Odessia's **day-grouped itinerary** with hero, add-slots, trip total, book CTA.
- No **guided menus**, **context chips**, or **preference micro-forms** — the "ultra-simple, step-by-step" guidance is missing.
- No **watch-outs** (proactive conflict detection) even though the system prompt asks for cons.

This revision defines the Odessia-aligned flow + information architecture and a **hybrid visual
evolution** ("Sky Glass 2.0 — Warm"), decided with the user:
- **Flow & structure → align to Odessia.**
- **Colors → keep the sky-blue accent + glass, warm up the neutral canvas.**
- **Type → serif display headings over Inter body.**
- **Glass → kept, softened.**

Non-goals are unchanged (no in-app booking, no accounts, English-only, redirect model).

## 2. The Odessia flow we are matching (reference)

A single continuous **conversation (left) + a living trip (right)** moving through stages:

1. **Landing** — personalized greeting + one **structured composer** (destination + date-range chip +
   travelers stepper + submit) + illustrated shortcut tiles (Hotels & homes / Flights / Things to do / Destinations).
2. **Guided start** — persistent **context chip bar** (`destination · dates · travelers`, all editable) +
   assistant **start menu** ("Find a hotel / Look up flights / Build the full trip") with Skip/Dismiss.
   Right pane opens as a **live map**.
3. **Search results in chat** — assistant narrates & curates ("I'll search well-located stays first" →
   "over 1,000 homes"), renders a **horizontal carousel of rich cards** (photo, ♥ save, rating · reviews,
   price) + a filter control. Map fills with **price pins**.
4. **Detail takeover** — clicking an item opens a full detail pane with a **left rail of siblings**, a
   **photo gallery**, structured facts, and (per type) **amenities grid / host / reviews / location map /
   availability slots / fare breakdown**, plus a price card with **Add to trip** + a **book-out link**.
5. **Preference micro-forms** — in-chat **multi-select** ("What would you like to do?") and **single-select**
   ("What pace?") with Skip/Next.
6. **Day-by-day itinerary (right pane)** — hero cover image + `Title · N nights · M travelers`, grouped by
   day, **dashed "add" slots** guiding the next step, item cards with thumbnails/prices, a **Trip total**,
   and **Continue to book**.
7. **Watch-outs** — assistant flags real conflicts (arrival after check-in = unused night; activity on the
   departure morning) and offers fixes (move → pick day → check availability → pick time → replace).
8. **Booking** — each item shows a **`NOT BOOKED` status** + its own **Book on X ↗** deep link (redirect
   model, ours already). Conversation "chapters" (thread dropdown) + toolbar (map/calendar/duplicate/share).

## 3. Sky Glass 2.0 — Warm (the hybrid I'm proposing)

Evolution of the existing tokens in `src/app/globals.css`, not a rewrite. The `.glass` primitive and
sky-blue accent stay; the canvas warms and headings go serif.

### 3.1 Color tokens

| Token | v1 (cool) | v2 (warm) | Use |
|---|---|---|---|
| `--canvas` | `#ECEFF3` | `#F4F2EC` (warm paper) | app background |
| glow | sky radial 14% | sky radial **8%**, warmer origin | faint depth, less cool |
| `--text` | `#0F172A` | `#1B2430` (warm ink) | body text |
| `--muted` | `#64748B` | `#6B7280` (warm grey) | secondary text |
| `--accent` | sky-500 `#0EA5E9` | **unchanged** | links, selected, focus, primary CTA |
| `--accent-hover` | sky-600 | **unchanged** | hover |
| `--ink` | — (new) | `#14213A` deep navy | hero display text + the single highest-emphasis "commit" pill (Continue to book / Book on X), echoing Odessia's dark button |

Rule of thumb: **sky-blue = interactive/brand**, **ink navy = the one commit action per surface**,
**warm neutrals = everything static**. Two accent colors max on any screen.

### 3.2 Glass (softened)

```
--glass-bg:     rgba(255,255,255,0.55)   /* was .30 — creamier, less see-through */
--glass-border: rgba(255,255,255,0.65)
--glass-shadow: 0 10px 30px rgba(20,33,58,0.08)   /* warmer, softer, was sky-tinted 40px */
blur:           18px saturate(135%)       /* was 28px / 160% — lighter frost */
radius:         20px (cards) / 26px (panes)
```

### 3.3 Typography

- **Display / headings:** a high-contrast elegant serif via `next/font/google` — **Fraunces**
  (variable; opsz + soft optical settings) — used for the landing greeting, trip title, section headings,
  and detail titles. This is the single biggest "Odessia feel" lever.
- **Body / UI:** **Inter** (unchanged) — chat, labels, prices, buttons, metadata.
- Scale: display 30–44px serif; section headings 18–22px serif; body 14–15px Inter; meta 12–13px Inter.

### 3.4 Motion & spacing

- More generous padding (cards `p-4`→`p-5` on panes), larger gaps between day groups.
- Cards lift subtly on hover (shadow + 1px translate); carousels scroll-snap.
- Keep everything calm — no bounce; 150–200ms ease.

### 3.5 Imagery

- Odessia's watercolor art is bespoke; we won't clone it. Landing tiles use **soft duotone-gradient tiles
  tinted toward sky/sand** with a category glyph, plus real Unsplash imagery on destination/experience cards
  (already in place). Optional: commission/AI-generate a small watercolor set later (out of scope now).

## 4. Information architecture / data model changes

Extends `src/lib/trip/types.ts`. Additive — existing fields keep working.

### 4.1 Trip

- `TripMeta.title?: string` — e.g. "Tenerife Escape" (assistant-generated; falls back to destination).
- `TripMeta.coverImage?: string` — hero image (from destination photos or first stay photo).
- Per-item `bookingStatus?: 'not_booked' | 'booked'` on Flight / Stay / itinerary activity (default not_booked).
- **Unified day timeline is derived, not stored.** Keep `flights[]`, `stays[]`, `days[]`; add a pure
  selector `buildTimeline(trip)` → ordered day groups that interleave: outbound flight (arrival day),
  stay (spanning banner), activities (on their dates), return flight (departure day). Right pane renders this.

### 4.2 Stays (detail)

Add optional detail fields hydrated lazily (kept undefined until a detail view is opened):
`address?`, `amenities?: string[]`, `host?: { name; sinceYear?; reviews?; superhost?; bio?; languages?: string[] }`,
`reviewSnippets?: ReviewSnippet[]`, `policies?: { checkIn?; checkOut?; cancellation?; houseRules?: string[] }`,
`guests?/bedrooms?/beds?/baths?`. `photos[]` already exists.

### 4.3 Activities (things to do)

Today "things to do" reuse `Place`. Introduce a distinct **`Activity`** shape (things-to-do have price,
duration, availability that places don't):
`id, name, category?, rating?, reviewCount?, price?, durationText?, photos[], coords?, description?,
highlights?: string[], availability?: { date; times: string[] }[], bookUrl`.
`Place` remains for map/POI reviews context.

### 4.4 Watch-outs (derived, pure, tested)

`computeWatchouts(trip)` → `Watchout[]` where
`Watchout = { id; severity: 'info'|'warning'; message; fixes: { label; prompt }[] }`.
Initial rules:
- Arrival date/time after stay check-in → "unused night(s)".
- Activity scheduled on the departure day before/around the return flight → "won't make it".
- Long layover / very long total journey → informational note.
- Stay end date ≠ return flight date → mismatch.

## 5. New chat interaction parts

The planner already round-trips trip state via a custom `data-trip` UIMessage part. Add typed parts the
agent can emit and the client renders as rich, interactive components (extends `TriperUIMessage`):

- **`data-options`** — a guided menu / choice list (start menu, next-step suggestions). Tapping a row
  sends its `prompt` as the next user message.
- **`data-results`** — a search-result set: `kind: 'stays'|'flights'|'activities'`, an array of cards, a
  count label, and filter affordance. Rendered as a horizontal carousel of rich cards; a card opens a
  **detail view**; "Add to trip" calls the corresponding add-by-id tool.
- **`data-form`** — a preference micro-form: `mode: 'multi'|'single'`, `question`, `options[]`, with
  Skip/Next; submitting sends the selections as a message.
- **Watch-outs** render from `computeWatchouts` as an inline assistant callout with fix buttons (each fix
  is an `data-options`-style prompt).

Tools continue to **stash results server-side and add-by-id**, so the model never fabricates data — the new
parts just make those stashed results visible and actionable in the UI.

## 6. Screen-by-screen target (aligned)

- **Landing** — serif greeting; structured composer (destination input + date-range + travelers stepper +
  submit); warm illustrated shortcut tiles; existing curated rows below.
- **Planner shell** — two-zone unchanged, but: chat gets a **context chip bar** (destination · dates ·
  travelers, editable → sends an update message) and an optional **chapter dropdown**; right pane toggles
  **Itinerary ⇄ Map** (Itinerary is the new default once anything is added).
- **Chat** — bubbles restyled (warm), plus the three interactive parts (§5), narrated/curated result intros,
  and watch-out callouts.
- **Itinerary pane** — hero (cover + title + dates + nights + travelers), day-grouped timeline, dashed
  add-slots for empty categories, rich item cards (thumbnail, price, dates, `NOT BOOKED` + `Book on X ↗`),
  **Trip total** + **Continue to book** footer, toolbar (map / share / duplicate).
- **Detail views** — Stay / Flight / Activity takeover panes with sibling rail, gallery, and the
  type-specific sections in §2.4; **Add to trip** + book-out.

## 7. Phased roadmap (recommended order)

Dependency-driven; each phase is independently shippable, TDD, merged to `main` before the next.

- **Plan 6a — Sky Glass 2.0 (Warm) foundation.** Warm tokens, softened glass, Fraunces serif via next/font,
  restyle existing components (chat bubbles, cards, buttons, landing). Pure visual; no behavior change.
- **Plan 6b — Trip model + day-grouped itinerary pane.** Extend types (title, cover, bookingStatus),
  `buildTimeline` + `computeWatchouts` pure selectors (tested), rebuild right pane into the Odessia
  itinerary (hero, day groups, add-slots, rich item cards, trip total, Continue to book). Map becomes the
  secondary toggle.
- **Plan 6c — Rich result cards + detail takeover views.** `data-results` part + carousels; Stay / Flight /
  Activity detail panes (gallery, amenities, host, reviews, location, availability, fare). Lazy detail
  hydration in the SearchApi layer where fields are missing.
- **Plan 6d — Guided chat interactions.** `data-options` start menu + next-steps, editable context chips,
  `data-form` preference micro-forms, narrated/curated result framing, chapter/thread switcher.
- **Plan 6e — Watch-outs & fix flows.** Surface `computeWatchouts` in chat + itinerary; actionable fixes
  (move/remove/re-search), availability-based rescheduling flow.
- **Plan 6f — Landing composer.** Structured composer (destination + dates + travelers), serif greeting,
  warm illustrated tiles; wire composer → `/plan` with structured context.

## 8. Risks / notes

- **Serif web font** adds weight — use `next/font` (self-hosted, subset, `display: swap`), variable, one family.
- **Detail-view data** may require extra SearchApi calls (Airbnb/Tripadvisor/flight fare endpoints) — hydrate
  lazily and cache (existing `withCache`), to control cost. Some fields may be unavailable per provider →
  components must degrade gracefully (hide empty sections).
- **Interactive message parts** are the main new technical surface; keep renderers pure/presentational and
  tested, mirroring the existing component test pattern (jsdom).
- Scope is large; strictly one plan at a time, merged and visually reviewed before the next.
