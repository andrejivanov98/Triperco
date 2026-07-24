# Plan 6c — Rich Result Cards + Detail Takeover Views — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the assistant's search results **in the chat** as horizontal carousels of rich cards (photo, rating · reviews, price), and let a card open a **detail takeover** in the right pane (gallery + available structured fields + a book-out link). Add **Add to trip** on cards and details, applied instantly client-side via the existing pure reducers.

**Architecture:** Search tools already stash full domain objects server-side; today only the final trip streams to the client. 6c adds a `data-results` UIMessage part: search tools push a `ResultSet` into `PlannerState.pendingResults`, and the chat route emits each set in `onFinish` (mirroring the existing `data-trip` emission). The client renders `data-results` parts as carousels; a card opens a right-pane `DetailView` (replacing the itinerary/map until closed). **Add to trip** mutates the client-owned `TripState` with the pure reducers (`addStay`/`addFlight`/`addItineraryItem`) — instant, and it round-trips to the server on the next message like everything else.

**Tech Stack:** AI SDK v7 UIMessage data parts, Next.js 15, TypeScript strict, Tailwind v4 (Sky Glass 2.0), Vitest + RTL.

**Scope note:** "Things to do" reuse the existing `Place` type (google_maps). The richer `Activity` (price/duration/availability) and stay amenities/host require Airbnb/Tripadvisor/GYG endpoints — deferred to a later plan (2b). Detail views render only fields the current normalizers provide and hide empty sections. External images use a plain `<img>` (no `next/image` host allowlisting), consistent with 6b.

---

## File Structure

- **Create:** `src/lib/ui/results.ts` (+ `results.test.ts`) — `ResultSet` discriminated union + `getResultSets(message)` helper.
- **Modify:** `src/lib/ui/messages.ts` — extend `TriperUIMessage` data map with `results`.
- **Modify:** `src/lib/ai/tools.ts` — `PlannerState.pendingResults`; push a `ResultSet` in `searchFlights`/`searchHotels`/`searchPlaces`.
- **Modify:** `src/app/api/chat/route.ts` — emit each pending `data-results` in `onFinish`.
- **Create:** `src/components/results/ResultCard.tsx` (+ test) — one card, kind-aware face.
- **Create:** `src/components/results/ResultCarousel.tsx` (+ test) — titled horizontal scroller.
- **Create:** `src/components/results/DetailView.tsx` (+ test) — right-pane takeover, kind-aware.
- **Modify:** `src/components/chat/ChatPane.tsx` (+ test) — render `data-results` carousels; add optional `onAddResult` / `onOpenDetail`.
- **Modify:** `src/components/PlannerScreen.tsx` — detail state, client-side add reducers, wire props, render `DetailView` overlay in the right pane.

---

## Task 1: `ResultSet` type + message extension + helper

**Files:**
- Create: `src/lib/ui/results.ts`
- Create: `src/lib/ui/results.test.ts`
- Modify: `src/lib/ui/messages.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/ui/results.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getResultSets } from './results'
import type { TriperUIMessage } from './messages'

describe('getResultSets', () => {
  it('collects data-results parts from a message in order', () => {
    const msg: TriperUIMessage = {
      id: 'm', role: 'assistant',
      parts: [
        { type: 'text', text: 'Here are some stays.' },
        { type: 'data-results', data: { kind: 'stays', query: 'Rome', items: [] } },
        { type: 'data-results', data: { kind: 'flights', query: 'SKP → FCO', items: [] } },
      ],
    }
    const sets = getResultSets(msg)
    expect(sets.map((s) => s.kind)).toEqual(['stays', 'flights'])
  })

  it('returns [] when there are no result parts', () => {
    const msg: TriperUIMessage = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] }
    expect(getResultSets(msg)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/ui/results.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `results.ts`**

```ts
import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { TriperUIMessage } from './messages'

/** A set of search results surfaced to the chat UI. Carries full domain objects. */
export type ResultSet =
  | { kind: 'flights'; query?: string; items: Flight[] }
  | { kind: 'stays'; query?: string; items: Stay[] }
  | { kind: 'places'; query?: string; items: Place[] }

/** All data-results parts on a message, in order. */
export function getResultSets(message: TriperUIMessage): ResultSet[] {
  return message.parts
    .filter((p): p is { type: 'data-results'; data: ResultSet } => p.type === 'data-results')
    .map((p) => p.data)
}
```

- [ ] **Step 4: Extend `messages.ts`**

Change the type import + alias:

```ts
import type { UIMessage } from 'ai'
import type { TripState } from '../trip/types'
import type { ResultSet } from './results'

/** Our chat message type: standard parts + custom data parts (trip sync + search results). */
export type TriperUIMessage = UIMessage<never, { trip: TripState; results: ResultSet }>
```

(Leave `getLatestTrip` unchanged. Note the intentional `messages ↔ results` import cycle is types-only and safe.)

- [ ] **Step 5: Run the test + typecheck**

Run: `npx vitest run src/lib/ui/results.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ui/results.ts src/lib/ui/results.test.ts src/lib/ui/messages.ts
git commit -m "feat(6c): ResultSet data part + getResultSets helper"
```

---

## Task 2: Search tools push result sets

**Files:**
- Modify: `src/lib/ai/tools.ts`
- Modify: `src/lib/ai/tools.test.ts`

- [ ] **Step 1: Add `pendingResults` to `PlannerState`**

Add the field to the interface and initializer:

```ts
export interface PlannerState {
  trip: TripState
  lastFlights: Flight[]
  lastStays: Stay[]
  lastPlaces: Place[]
  pendingResults: ResultSet[]
}

export function createPlannerState(trip?: TripState): PlannerState {
  return {
    trip: trip ?? createTrip('draft'),
    lastFlights: [],
    lastStays: [],
    lastPlaces: [],
    pendingResults: [],
  }
}
```

Add the import at the top:

```ts
import type { ResultSet } from '../ui/results'
```

- [ ] **Step 2: Push a `ResultSet` in each search tool (right after stashing)**

In `searchFlights.execute`, after `state.lastFlights = await apiSearchFlights(params, deps)`:

```ts
        state.pendingResults.push({
          kind: 'flights',
          query: `${params.departure_id} → ${params.arrival_id}`,
          items: state.lastFlights,
        })
```

In `searchHotels.execute`, after `state.lastStays = await apiSearchHotels(params, deps)`:

```ts
        state.pendingResults.push({ kind: 'stays', query: params.q, items: state.lastStays })
```

In `searchPlaces.execute`, after `state.lastPlaces = await apiSearchPlaces(params, deps)`:

```ts
        state.pendingResults.push({ kind: 'places', query: params.q, items: state.lastPlaces })
```

(Leave the trimmed return values unchanged — the model still gets ids only.)

- [ ] **Step 3: Extend the tools test to assert the push**

In `src/lib/ai/tools.test.ts`, in the `searchFlights + addFlight` test after the results assertion, add:

```ts
    expect(state.pendingResults).toHaveLength(1)
    expect(state.pendingResults[0]).toMatchObject({ kind: 'flights' })
    expect(state.pendingResults[0].items).toHaveLength(1)
```

- [ ] **Step 4: Run the tools tests + typecheck**

Run: `npx vitest run src/lib/ai/tools.test.ts`
Expected: PASS (existing + new assertions).
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/tools.ts src/lib/ai/tools.test.ts
git commit -m "feat(6c): search tools push ResultSets to pendingResults"
```

---

## Task 3: Route emits `data-results`

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Emit pending result sets in `onFinish`**

Update the `onFinish` callback to also write each pending set:

```ts
        onFinish: () => {
          // Emit the trip the tools built this turn so the client can render it.
          writer.write({ type: 'data-trip', data: state.trip })
          // Emit each search performed this turn so the client can show result carousels.
          for (const set of state.pendingResults) {
            writer.write({ type: 'data-results', data: set })
          }
        },
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck`
Run: `rm -rf .next && npm run build`
Expected: both succeed (route is type-checked against `TriperUIMessage`; no unit test — verified end-to-end in Task 8 visual review).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(6c): stream data-results parts from the chat route"
```

---

## Task 4: `ResultCard` + `ResultCarousel`

**Files:**
- Create: `src/components/results/ResultCard.tsx`
- Create: `src/components/results/ResultCard.test.tsx`
- Create: `src/components/results/ResultCarousel.tsx`
- Create: `src/components/results/ResultCarousel.test.tsx`

A `ResultCard` shows one result's face for a given kind, with **Open** (whole-card click → detail) and **Add to trip**. `ResultCarousel` renders a titled horizontal scroller of cards.

- [ ] **Step 1: Write the failing `ResultCard` test**

`src/components/results/ResultCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCard } from './ResultCard'
import type { Stay } from '@/lib/trip/types'

const stay: Stay = {
  id: 's1', name: "Guido's Apartments", source: 'airbnb', rating: 4.8, reviewCount: 56,
  pricePerNight: 100, nights: 14, photos: ['https://img/x.jpg'], bookUrl: 'https://air/1',
}

describe('ResultCard (stay)', () => {
  it('renders name, rating·reviews and per-night price', () => {
    render(<ResultCard kind="stays" item={stay} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText("Guido's Apartments")).toBeInTheDocument()
    expect(screen.getByText(/4\.8/)).toBeInTheDocument()
    expect(screen.getByText(/56/)).toBeInTheDocument()
    expect(screen.getByText('$100')).toBeInTheDocument()
  })

  it('calls onOpen when the card body is clicked and onAdd from the Add button', () => {
    const onOpen = vi.fn()
    const onAdd = vi.fn()
    render(<ResultCard kind="stays" item={stay} onOpen={onOpen} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    expect(onOpen).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /add to trip/i }))
    expect(onAdd).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/results/ResultCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ResultCard.tsx`**

```tsx
import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { formatMoney } from '@/lib/ui/format'

type Item = Flight | Stay | Place

function metaLine(kind: ResultSet['kind'], item: Item): { title: string; sub?: string; photo?: string; price?: string } {
  if (kind === 'stays') {
    const s = item as Stay
    const rating = [s.rating !== undefined ? `${s.rating} ★` : null, s.reviewCount !== undefined ? `${s.reviewCount.toLocaleString()} reviews` : null].filter(Boolean).join(' · ')
    return { title: s.name, sub: rating || (s.source === 'airbnb' ? 'Home' : 'Hotel'), photo: s.photos[0], price: `${formatMoney(s.pricePerNight)}/night` }
  }
  if (kind === 'flights') {
    const f = item as Flight
    const stops = f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`
    return { title: `${f.from} → ${f.to}`, sub: [f.airline, stops, f.departTime && f.arriveTime ? `${f.departTime}–${f.arriveTime}` : null].filter(Boolean).join(' · '), price: formatMoney(f.price) }
  }
  const p = item as Place
  const rating = [p.rating !== undefined ? `${p.rating} ★` : null, p.reviewCount !== undefined ? `${p.reviewCount.toLocaleString()} reviews` : null].filter(Boolean).join(' · ')
  return { title: p.name, sub: [p.category, rating].filter(Boolean).join(' · ') || undefined, photo: p.photos[0] }
}

export function ResultCard({
  kind, item, onOpen, onAdd,
}: {
  kind: ResultSet['kind']
  item: Item
  onOpen: () => void
  onAdd: () => void
}) {
  const { title, sub, photo, price } = metaLine(kind, item)
  return (
    <div className="glass flex w-56 shrink-0 flex-col overflow-hidden p-0">
      <button type="button" onClick={onOpen} aria-label={`View details for ${title}`} className="block text-left">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-32 w-full object-cover" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-sand text-2xl">
            {kind === 'flights' ? '✈' : '📍'}
          </div>
        )}
        <div className="p-3">
          <div className="truncate text-sm font-semibold text-ink">{title}</div>
          {sub && <div className="mt-0.5 line-clamp-1 text-xs font-medium text-muted">{sub}</div>}
        </div>
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 px-3 pb-3">
        {price ? <span className="text-sm font-bold text-ink">{price}</span> : <span />}
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-accent/25"
        >
          Add to trip
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/results/ResultCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing `ResultCarousel` test**

`src/components/results/ResultCarousel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCarousel } from './ResultCarousel'
import type { ResultSet } from '@/lib/ui/results'

const set: ResultSet = {
  kind: 'stays', query: 'Rome',
  items: [
    { id: 's1', name: 'Hotel One', source: 'hotel', pricePerNight: 90, nights: 3, photos: [], bookUrl: 'x' },
    { id: 's2', name: 'Hotel Two', source: 'hotel', pricePerNight: 120, nights: 3, photos: [], bookUrl: 'y' },
  ],
}

describe('ResultCarousel', () => {
  it('renders a count label and one card per item', () => {
    render(<ResultCarousel set={set} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText(/2 stays/i)).toBeInTheDocument()
    expect(screen.getByText('Hotel One')).toBeInTheDocument()
    expect(screen.getByText('Hotel Two')).toBeInTheDocument()
  })

  it('passes the clicked item to onAdd', () => {
    const onAdd = vi.fn()
    render(<ResultCarousel set={set} onOpen={() => {}} onAdd={onAdd} />)
    fireEvent.click(screen.getAllByRole('button', { name: /add to trip/i })[1])
    expect(onAdd).toHaveBeenCalledWith(set, set.items[1])
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/components/results/ResultCarousel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `ResultCarousel.tsx`**

```tsx
import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { ResultCard } from './ResultCard'

const KIND_NOUN: Record<ResultSet['kind'], string> = {
  flights: 'flights',
  stays: 'stays',
  places: 'places',
}

export function ResultCarousel({
  set, onOpen, onAdd,
}: {
  set: ResultSet
  onOpen: (set: ResultSet, item: Flight | Stay | Place) => void
  onAdd: (set: ResultSet, item: Flight | Stay | Place) => void
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="text-xs font-semibold text-muted">
        {set.items.length} {KIND_NOUN[set.kind]}
        {set.query ? ` · ${set.query}` : ''}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {set.items.map((item) => (
          <ResultCard
            key={item.id}
            kind={set.kind}
            item={item}
            onOpen={() => onOpen(set, item)}
            onAdd={() => onAdd(set, item)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/components/results/ResultCarousel.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/results/ResultCard.tsx src/components/results/ResultCard.test.tsx src/components/results/ResultCarousel.tsx src/components/results/ResultCarousel.test.tsx
git commit -m "feat(6c): ResultCard + ResultCarousel for in-chat search results"
```

---

## Task 5: `DetailView` (right-pane takeover)

**Files:**
- Create: `src/components/results/DetailView.tsx`
- Create: `src/components/results/DetailView.test.tsx`

Kind-aware detail: back button, photo gallery (when photos exist), title + rating, a facts/meta block, review snippets (places, when hydrated), and a footer with **Add to trip** + **Book on X ↗**. Empty sections are hidden.

- [ ] **Step 1: Write the failing test**

`src/components/results/DetailView.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DetailView } from './DetailView'
import type { Stay } from '@/lib/trip/types'

const stay: Stay = {
  id: 's1', name: "Guido's Apartments", source: 'airbnb', rating: 4.8, reviewCount: 56,
  pricePerNight: 100, nights: 14, photos: ['https://img/a.jpg', 'https://img/b.jpg'], bookUrl: 'https://air/1',
}

describe('DetailView (stay)', () => {
  it('renders the title, price, gallery and a book-out link', () => {
    render(<DetailView kind="stays" item={stay} onClose={() => {}} onAdd={() => {}} />)
    expect(screen.getByRole('heading', { name: "Guido's Apartments" })).toBeInTheDocument()
    expect(screen.getByText('$1,400')).toBeInTheDocument() // 100 * 14 total
    expect(screen.getAllByRole('img').length).toBe(2)
    const book = screen.getByRole('link', { name: /book on airbnb/i })
    expect(book).toHaveAttribute('href', 'https://air/1')
  })

  it('fires onClose and onAdd', () => {
    const onClose = vi.fn()
    const onAdd = vi.fn()
    render(<DetailView kind="stays" item={stay} onClose={onClose} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onClose).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /add to trip/i }))
    expect(onAdd).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/results/DetailView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DetailView.tsx`**

```tsx
import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { formatMoney } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'

type Item = Flight | Stay | Place

interface DetailShape {
  title: string
  ratingLine?: string
  photos: string[]
  facts: string[]
  reviews: { author?: string; text: string }[]
  priceLabel?: string
  bookUrl?: string
  bookLabel: string
}

function toDetail(kind: ResultSet['kind'], item: Item): DetailShape {
  if (kind === 'stays') {
    const s = item as Stay
    return {
      title: s.name,
      ratingLine: s.rating !== undefined ? `${s.rating} ★ · ${(s.reviewCount ?? 0).toLocaleString()} reviews` : undefined,
      photos: s.photos,
      facts: [s.source === 'airbnb' ? 'Entire home' : 'Hotel', `${s.nights} nights`].filter(Boolean),
      reviews: [],
      priceLabel: `${formatMoney(s.pricePerNight * s.nights)} total`,
      bookUrl: s.bookUrl,
      bookLabel: s.source === 'airbnb' ? 'Book on Airbnb' : 'Book stay',
    }
  }
  if (kind === 'flights') {
    const f = item as Flight
    const stops = f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`
    return {
      title: `${f.from} → ${f.to}`,
      ratingLine: f.airline,
      photos: [],
      facts: [
        f.departTime && f.arriveTime ? `${f.departTime} – ${f.arriveTime}` : undefined,
        stops,
        f.durationMinutes ? `${Math.floor(f.durationMinutes / 60)}h ${f.durationMinutes % 60}m` : undefined,
      ].filter((x): x is string => Boolean(x)),
      reviews: [],
      priceLabel: formatMoney(f.price),
      bookUrl: f.bookUrl,
      bookLabel: f.airline ? `Book on ${f.airline}` : 'Book flight',
    }
  }
  const p = item as Place
  return {
    title: p.name,
    ratingLine: p.rating !== undefined ? `${p.rating} ★ · ${(p.reviewCount ?? 0).toLocaleString()} reviews` : undefined,
    photos: p.photos,
    facts: [p.category, p.address, p.hours].filter((x): x is string => Boolean(x)),
    reviews: p.reviewSnippets ?? [],
    priceLabel: undefined,
    bookUrl: p.sourceLinks?.maps,
    bookLabel: 'Open in Maps',
  }
}

export function DetailView({
  kind, item, onClose, onAdd,
}: {
  kind: ResultSet['kind']
  item: Item
  onClose: () => void
  onAdd: () => void
}) {
  const d = toDetail(kind, item)
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-sm font-semibold text-accent">
          ← Back
        </button>
        {d.priceLabel && <span className="text-sm font-bold text-ink">{d.priceLabel}</span>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {d.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {d.photos.slice(0, 6).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className={'w-full rounded-xl object-cover ' + (i === 0 ? 'col-span-2 h-40' : 'h-24')}
              />
            ))}
          </div>
        )}

        <div>
          <Heading level={2} className="text-xl">{d.title}</Heading>
          {d.ratingLine && <div className="mt-0.5 text-sm font-medium text-muted">{d.ratingLine}</div>}
        </div>

        {d.facts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {d.facts.map((f) => (
              <span key={f} className="rounded-full border border-hairline bg-white/60 px-3 py-1 text-xs font-medium text-ink">
                {f}
              </span>
            ))}
          </div>
        )}

        {d.reviews.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold text-ink">What guests say</div>
            {d.reviews.slice(0, 4).map((r, i) => (
              <div key={i} className="glass p-3 text-xs font-medium text-ink">
                {r.author && <span className="font-bold">{r.author}: </span>}
                {r.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/25"
        >
          Add to trip
        </button>
        {d.bookUrl && (
          <a
            href={d.bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-deep px-4 py-2.5 text-sm font-bold text-white"
          >
            {d.bookLabel} ↗
          </a>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/results/DetailView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/results/DetailView.tsx src/components/results/DetailView.test.tsx
git commit -m "feat(6c): DetailView takeover (gallery, facts, reviews, book-out)"
```

---

## Task 6: ChatPane renders result carousels

**Files:**
- Modify: `src/components/chat/ChatPane.tsx`
- Modify: `src/components/chat/ChatPane.test.tsx`

- [ ] **Step 1: Add optional props + render carousels**

Update the props interface and imports:

```tsx
import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { getResultSets } from '@/lib/ui/results'
import { ResultCarousel } from '@/components/results/ResultCarousel'
```

```tsx
interface ChatPaneProps {
  messages: TriperUIMessage[]
  status: string
  suggestions: string[]
  onSend: (text: string) => void
  onAddResult?: (set: ResultSet, item: Flight | Stay | Place) => void
  onOpenDetail?: (set: ResultSet, item: Flight | Stay | Place) => void
}
```

In the message map, after rendering the text bubble, render any result carousels for assistant messages:

```tsx
        {messages.map((m) => {
          const sets = m.role === 'assistant' ? getResultSets(m) : []
          const text = messageText(m)
          return (
            <div key={m.id} className="flex flex-col gap-2">
              {text && (
                <div
                  className={
                    m.role === 'user'
                      ? 'ml-6 rounded-2xl border border-hairline bg-sand px-3 py-2 text-sm font-medium text-ink'
                      : 'rounded-2xl border border-hairline bg-white/60 px-3 py-2 text-sm font-medium text-ink'
                  }
                >
                  {text}
                </div>
              )}
              {sets.map((set, i) => (
                <ResultCarousel
                  key={i}
                  set={set}
                  onOpen={(s, item) => onOpenDetail?.(s, item)}
                  onAdd={(s, item) => onAddResult?.(s, item)}
                />
              ))}
            </div>
          )
        })}
```

(Keep `messageText`, the suggestion chips, and the form exactly as they are. The `text &&` guard prevents an empty bubble when a message is results-only.)

- [ ] **Step 2: Add a test for carousel rendering**

Append to `src/components/chat/ChatPane.test.tsx` — a message carrying a `data-results` part:

```tsx
  it('renders a result carousel from a data-results part', () => {
    const withResults: TriperUIMessage[] = [
      {
        id: 'r', role: 'assistant',
        parts: [
          { type: 'text', text: 'Here are stays.' },
          { type: 'data-results', data: { kind: 'stays', query: 'Rome', items: [
            { id: 's1', name: 'Hotel One', source: 'hotel', pricePerNight: 90, nights: 3, photos: [], bookUrl: 'x' },
          ] } },
        ],
      },
    ]
    render(<ChatPane messages={withResults} status="ready" suggestions={[]} onSend={() => {}} />)
    expect(screen.getByText('Hotel One')).toBeInTheDocument()
    expect(screen.getByText(/1 stays/i)).toBeInTheDocument()
  })
```

- [ ] **Step 3: Run the chat tests**

Run: `npx vitest run src/components/chat`
Expected: PASS (3 existing + 1 new).

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/ChatPane.tsx src/components/chat/ChatPane.test.tsx
git commit -m "feat(6c): render in-chat result carousels in ChatPane"
```

---

## Task 7: Wire detail + client-side add in PlannerScreen

**Files:**
- Modify: `src/components/PlannerScreen.tsx`

- [ ] **Step 1: Add imports for reducers, result types, and DetailView**

```tsx
import type { Flight, Stay, Place, ItineraryItem } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { createTrip, addFlight, addStay, addItineraryItem } from '@/lib/trip/tripState'
import { DetailView } from './results/DetailView'
```

(Adjust the existing `createTrip` import line so it also pulls `addFlight, addStay, addItineraryItem`.)

- [ ] **Step 2: Add detail state + handlers (inside the component, after existing state)**

```tsx
  const [detail, setDetail] = useState<{ kind: ResultSet['kind']; item: Flight | Stay | Place } | null>(null)

  const addResult = useCallback((set: ResultSet, item: Flight | Stay | Place) => {
    setTrip((t) => {
      if (set.kind === 'stays') return addStay(t, item as Stay)
      if (set.kind === 'flights') return addFlight(t, item as Flight)
      const p = item as Place
      const entry: ItineraryItem = { placeId: p.id, name: p.name, coords: p.coords }
      return addItineraryItem(t, 0, entry)
    })
  }, [])

  const openDetail = useCallback((set: ResultSet, item: Flight | Stay | Place) => {
    setDetail({ kind: set.kind, item })
    setView('plan')
  }, [])
```

- [ ] **Step 3: Pass the handlers to ChatPane**

```tsx
      <ChatPane
        messages={messages}
        status={status}
        suggestions={messages.length === 0 ? SUGGESTIONS : []}
        onSend={(text) => sendMessage({ text })}
        onAddResult={addResult}
        onOpenDetail={openDetail}
      />
```

- [ ] **Step 4: Render `DetailView` as the right-pane takeover when a detail is open**

Replace the right-pane content block so the detail overlays the toggle:

```tsx
      <div className="glass flex min-h-0 flex-col gap-3 p-4">
        {detail ? (
          <DetailView
            kind={detail.kind}
            item={detail.item}
            onClose={() => setDetail(null)}
            onAdd={() => {
              addResult({ kind: detail.kind, items: [] } as ResultSet, detail.item)
              setDetail(null)
            }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <PlanMapToggle view={view} onChange={setView} />
              <ShareButton onShare={handleShare} sharing={sharing} shareUrl={shareUrl} />
            </div>
            <div className="min-h-0 flex-1">
              {view === 'plan' ? <ItineraryView trip={trip} /> : <MapView markers={markers} />}
            </div>
          </>
        )}
      </div>
```

Note: the `onAdd` cast builds a minimal `ResultSet` just to reuse `addResult`'s kind switch; `items` is unused by the add path.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (Confirm `useCallback` is imported — it already is in the existing file.)

- [ ] **Step 6: Commit**

```bash
git add src/components/PlannerScreen.tsx
git commit -m "feat(6c): detail takeover + client-side add-to-trip in planner"
```

---

## Task 8: Full verification + visual review + finish

**Files:** none (verification only).

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npm test` → all pass.
Run: `npm run typecheck` → clean.
Run: `rm -rf .next && npm run build` → succeeds; route table unchanged.

- [ ] **Step 2: Visual review**

`npm run dev`, then at `http://localhost:3000/plan?q=Find%20me%20a%20hotel%20in%20Rome%20for%203%20nights` confirm (requires real `SEARCHAPI_API_KEY` + `GEMINI` key in `.env.local`):
- The assistant's hotel search renders a **carousel** of photo cards (rating · reviews · price) under its message.
- Clicking a card opens the **DetailView** in the right pane (gallery + facts + book-out); **← Back** returns to the itinerary.
- **Add to trip** (card or detail) instantly adds the item to the itinerary and updates the Trip total.
- Flights and "things to do" searches likewise render carousels + details.
- Empty sections (e.g. no reviews) are simply absent — no broken layout.

- [ ] **Step 3: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** → on "merge locally", merge `feat/6c-results-and-detail-views` into `main`, delete the branch, and update the project memory file to mark 6c complete.

---

## Self-Review

- **Spec coverage:** Implements spec §5 (`data-results` part), §2.3 (in-chat curated result carousels) and §2.4 (detail takeover: gallery, facts, reviews, book-out) for the three kinds the current data supports; stay amenities/host and activity availability explicitly deferred (documented). Add-to-trip via reducers matches the redirect model (no in-app booking). ✓
- **Placeholder scan:** Full code for `results.ts`, tool/route edits, and all four components; exact edit blocks for ChatPane + PlannerScreen. No TBDs. ✓
- **Type consistency:** `ResultSet` (discriminated `flights|stays|places`) is used identically in `results.ts`, tools, route, `ResultCard`, `ResultCarousel`, `DetailView`, `ChatPane`, `PlannerScreen`. Cards/detail consume the existing `Flight`/`Stay`/`Place` verbatim. `onAddResult`/`onOpenDetail` share one `(set, item)` signature everywhere. ✓
- **Reducer reuse:** Client-side add calls the same tested `addStay`/`addFlight`/`addItineraryItem` (with `withTotal`) the agent uses, so totals stay correct and state stays consistent through the round-trip. ✓
- **Test reality:** Components/helpers get real red→green tests (RTL + a helper unit test). The route emission is type-checked + build-verified + visually confirmed (no meaningful unit seam), consistent with how `data-trip` is already handled. ✓
