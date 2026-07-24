# Plan 6b — Day-Grouped Itinerary Pane — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat right-pane plan list with Odessia's **day-grouped itinerary**: a hero (cover + serif title + dates · nights · travelers), a single itinerary card that sequences arrival flight → stay → activity days → return flight with **dashed "add" slots** for what's missing, rich item cards (thumbnail, price, dates, `NOT BOOKED` + `Book on X ↗`), a read-only **watch-outs** banner, and a **Trip total + Continue to book** footer.

**Architecture:** Two pure, fully-tested selectors — `buildTimeline(trip)` (sequences the trip into content groups) and `computeWatchouts(trip)` (feasible conflict checks on today's data) — feed a set of presentational (server-renderable, no client hooks) itinerary components. The planner shell swaps `PlanView` → `ItineraryView` behind the existing Plan/Map toggle (relabelled **Itinerary/Map**); the shared `/trip/[id]` page reuses the same `ItineraryView` so shared trips look identical. Old thin cards (`PlanView`, `FlightCard`, `StayCard`, `DayCard`) are superseded and removed with their tests.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v4 (Sky Glass 2.0 tokens from 6a), Vitest + RTL (jsdom). `Date` is used only in app/lib code (fine — the ban is workflow-script-only); date utils use UTC + fixed arrays for deterministic, locale-independent tests.

**Sequencing note (deviation from spec §7):** The spec listed `computeWatchouts` under 6b and richer watch-out *rules* under 6e. Rules that need dated flights/activities (e.g. "arrive after check-in") are deferred to 6e because that data does not exist until 6c/6d. 6b ships `computeWatchouts` with the rules feasible today and a shape built to extend.

---

## File Structure

- **Modify:** `src/lib/trip/types.ts` — add `TripMeta.title?`, `TripMeta.coverImage?`, `Flight.bookingStatus?`, `Stay.bookingStatus?`.
- **Create:** `src/lib/trip/dates.ts` (+ `dates.test.ts`) — deterministic date helpers.
- **Create:** `src/lib/trip/timeline.ts` (+ `timeline.test.ts`) — `buildTimeline` + timeline types.
- **Create:** `src/lib/trip/watchouts.ts` (+ `watchouts.test.ts`) — `computeWatchouts` + `Watchout` type.
- **Create:** `src/components/itinerary/TimelineItemCard.tsx` (+ test)
- **Create:** `src/components/itinerary/WatchoutBanner.tsx` (+ test)
- **Create:** `src/components/itinerary/ItineraryView.tsx` (+ test)
- **Modify:** `src/components/PlannerScreen.tsx` — use `ItineraryView`; relabel toggle.
- **Modify:** `src/components/plan/PlanMapToggle.tsx` — labels `📋 Itinerary` / `🗺 Map`; default value stays `plan`.
- **Modify:** `src/app/trip/[id]/page.tsx` — render `ItineraryView` instead of `PlanView`.
- **Delete:** `src/components/plan/PlanView.tsx` + `PlanView.test.tsx`, `FlightCard.tsx` + test, `StayCard.tsx` + test, `DayCard.tsx` + test.

---

## Task 1: Extend the trip types

**Files:**
- Modify: `src/lib/trip/types.ts`

- [ ] **Step 1: Add optional fields (additive — no reducer/test changes)**

In `TripMeta` add:

```ts
  title?: string
  coverImage?: string
```

In `Flight` add (after `bookUrl`):

```ts
  bookingStatus?: 'not_booked' | 'booked'
```

In `Stay` add (after `bookUrl`):

```ts
  bookingStatus?: 'not_booked' | 'booked'
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors (fields are optional; existing code unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/lib/trip/types.ts
git commit -m "feat(6b): add title/coverImage + per-item bookingStatus to trip types"
```

---

## Task 2: Deterministic date helpers

**Files:**
- Create: `src/lib/trip/dates.ts`
- Create: `src/lib/trip/dates.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/trip/dates.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { enumerateDates, formatDayLabel, formatDateRange, nightsBetween } from './dates'

describe('dates', () => {
  it('enumerates an inclusive ISO date range', () => {
    expect(enumerateDates('2026-09-01', '2026-09-04')).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ])
  })

  it('returns [] for missing or unparseable input', () => {
    expect(enumerateDates(undefined, '2026-09-04')).toEqual([])
    expect(enumerateDates('September 1', '2026-09-04')).toEqual([])
    expect(enumerateDates('2026-09-04', '2026-09-01')).toEqual([]) // end before start
  })

  it('formats a weekday + month/day label deterministically', () => {
    expect(formatDayLabel('2026-09-01')).toBe('Tue, Sep 1')
    expect(formatDayLabel('2026-09-15')).toBe('Tue, Sep 15')
  })

  it('formats a compact date range', () => {
    expect(formatDateRange('2026-09-01', '2026-09-15')).toBe('Sep 1 – 15')
    expect(formatDateRange('2026-09-28', '2026-10-02')).toBe('Sep 28 – Oct 2')
  })

  it('counts nights between two ISO dates', () => {
    expect(nightsBetween('2026-09-01', '2026-09-15')).toBe(14)
    expect(nightsBetween('2026-09-01', '2026-09-01')).toBe(0)
    expect(nightsBetween('bad', '2026-09-15')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/trip/dates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `dates.ts`**

```ts
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Strict YYYY-MM-DD → epoch ms at UTC midnight, or null. */
function parseISO(s?: string): number | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const [, y, mo, d] = m
  const ts = Date.UTC(Number(y), Number(mo) - 1, Number(d))
  const dt = new Date(ts)
  // reject overflow (e.g. 2026-02-31)
  if (dt.getUTCMonth() !== Number(mo) - 1 || dt.getUTCDate() !== Number(d)) return null
  return ts
}

const DAY = 86_400_000

function toISO(ts: number): string {
  const d = new Date(ts)
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${mo}-${day}`
}

/** Inclusive list of ISO dates from start..end; [] if unparseable or end<start. */
export function enumerateDates(start?: string, end?: string): string[] {
  const a = parseISO(start)
  const b = parseISO(end)
  if (a === null || b === null || b < a) return []
  const out: string[] = []
  for (let ts = a; ts <= b; ts += DAY) out.push(toISO(ts))
  return out
}

/** "Tue, Sep 1" — deterministic, locale-independent. Falls back to input if unparseable. */
export function formatDayLabel(iso?: string): string {
  const ts = parseISO(iso)
  if (ts === null) return iso ?? ''
  const d = new Date(ts)
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** "Sep 1 – 15" (same month) or "Sep 28 – Oct 2" (crossing months). */
export function formatDateRange(start?: string, end?: string): string {
  const a = parseISO(start)
  const b = parseISO(end)
  if (a === null || b === null) return ''
  const da = new Date(a)
  const db = new Date(b)
  const left = `${MONTHS[da.getUTCMonth()]} ${da.getUTCDate()}`
  const right =
    da.getUTCMonth() === db.getUTCMonth()
      ? `${db.getUTCDate()}`
      : `${MONTHS[db.getUTCMonth()]} ${db.getUTCDate()}`
  return `${left} – ${right}`
}

/** Whole nights between two ISO dates, or undefined if unparseable. */
export function nightsBetween(start?: string, end?: string): number | undefined {
  const a = parseISO(start)
  const b = parseISO(end)
  if (a === null || b === null) return undefined
  return Math.round((b - a) / DAY)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/trip/dates.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trip/dates.ts src/lib/trip/dates.test.ts
git commit -m "feat(6b): deterministic date helpers for the itinerary"
```

---

## Task 3: `buildTimeline` selector

**Files:**
- Create: `src/lib/trip/timeline.ts`
- Create: `src/lib/trip/timeline.test.ts`

Sequences a trip into ordered content groups matching Odessia's itinerary card:
arrival (outbound flight **or** a flights add-slot → stay → activities add-slot if empty) →
one group per activity day → return group (return flight, if a 2nd flight exists).

- [ ] **Step 1: Write the failing test**

`src/lib/trip/timeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildTimeline } from './timeline'
import { createTrip } from './tripState'
import type { TripState } from './types'

function base(): TripState {
  return {
    ...createTrip('t1'),
    meta: { travelers: 2, destination: 'Tenerife', startDate: '2026-09-01', endDate: '2026-09-15' },
  }
}

describe('buildTimeline', () => {
  it('shows a flights add-slot and a stay when only a stay is added', () => {
    const trip: TripState = {
      ...base(),
      stays: [
        {
          id: 's1', name: "Guido's Apartments", source: 'airbnb',
          pricePerNight: 100, nights: 14, photos: ['p.jpg'], bookUrl: 'https://air/1',
        },
      ],
    }
    const tl = buildTimeline(trip)
    expect(tl.headerLabel).toBe('Tenerife · Sep 1 – 15')
    const arrival = tl.groups[0]
    expect(arrival.addSlots).toContain('flights')
    const stayItem = arrival.items.find((i) => i.kind === 'stay')
    expect(stayItem?.title).toBe("Guido's Apartments")
    expect(stayItem?.price).toBe(1400) // pricePerNight * nights
    expect(stayItem?.priceUnit).toBe('total')
    expect(stayItem?.bookLabel).toBe('Book on Airbnb')
    // no activities anywhere → arrival group offers an activities add-slot
    expect(arrival.addSlots).toContain('activities')
  })

  it('places the outbound flight in arrival and the return flight in its own group', () => {
    const trip: TripState = {
      ...base(),
      flights: [
        { id: 'f1', from: 'SKP', to: 'TFN', price: 500, stops: 2, bookUrl: 'x', departTime: '3:10 PM', arriveTime: '5:00 PM' },
        { id: 'f2', from: 'TFN', to: 'SKP', price: 500, stops: 2, bookUrl: 'y', departTime: '9:55 AM', arriveTime: '2:10 AM' },
      ],
    }
    const tl = buildTimeline(trip)
    expect(tl.groups[0].items.some((i) => i.kind === 'flight' && i.id === 'f1')).toBe(true)
    expect(tl.groups[0].addSlots).not.toContain('flights')
    const ret = tl.groups[tl.groups.length - 1]
    expect(ret.items.some((i) => i.kind === 'flight' && i.id === 'f2')).toBe(true)
  })

  it('creates a dated group per activity day', () => {
    const trip: TripState = {
      ...base(),
      days: [
        { date: '2026-09-06', items: [{ placeId: 'a1', name: 'Whale watching' }] },
      ],
    }
    const tl = buildTimeline(trip)
    const actGroup = tl.groups.find((g) => g.label === 'Sun, Sep 6')
    expect(actGroup?.items[0]).toMatchObject({ kind: 'activity', title: 'Whale watching' })
  })

  it('falls back to "Your trip" header when dates are unparseable', () => {
    const trip: TripState = { ...createTrip('t2'), meta: { travelers: 1 } }
    expect(buildTimeline(trip).headerLabel).toBe('Your trip')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/trip/timeline.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `timeline.ts`**

```ts
import type { TripState, Flight, Stay } from './types'
import { enumerateDates, formatDayLabel, formatDateRange } from './dates'

export type TimelineItemKind = 'flight' | 'stay' | 'activity'
export type AddSlot = 'flights' | 'activities'

export interface TimelineItem {
  kind: TimelineItemKind
  id: string
  title: string
  subtitle?: string
  timeLabel?: string
  dateLabel?: string
  price?: number
  priceUnit?: 'total' | 'night'
  thumbnail?: string
  bookUrl?: string
  bookLabel?: string
  bookingStatus: 'not_booked' | 'booked'
}

export interface TimelineGroup {
  label?: string
  items: TimelineItem[]
  addSlots: AddSlot[]
}

export interface Timeline {
  headerLabel: string
  groups: TimelineGroup[]
}

function flightItem(f: Flight): TimelineItem {
  const stops = f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`
  const times =
    f.departTime && f.arriveTime ? `${f.departTime} – ${f.arriveTime}` : f.departTime
  return {
    kind: 'flight',
    id: f.id,
    title: `${f.from} → ${f.to}`,
    subtitle: [f.airline, stops].filter(Boolean).join(' · '),
    timeLabel: times,
    price: f.price,
    priceUnit: 'total',
    bookUrl: f.bookUrl,
    bookLabel: f.airline ? `Book on ${f.airline}` : 'Book flight',
    bookingStatus: f.bookingStatus ?? 'not_booked',
  }
}

function stayItem(s: Stay): TimelineItem {
  return {
    kind: 'stay',
    id: s.id,
    title: s.name,
    subtitle: s.source === 'airbnb' ? 'Home' : 'Hotel',
    price: s.pricePerNight * s.nights,
    priceUnit: 'total',
    thumbnail: s.photos[0],
    bookUrl: s.bookUrl,
    bookLabel: s.source === 'airbnb' ? 'Book on Airbnb' : 'Book stay',
    bookingStatus: s.bookingStatus ?? 'not_booked',
  }
}

export function buildTimeline(trip: TripState): Timeline {
  const { meta, flights, stays, days } = trip
  const dates = enumerateDates(meta.startDate, meta.endDate)

  const headerLabel = meta.startDate && meta.endDate && formatDateRange(meta.startDate, meta.endDate)
    ? `${meta.destination ?? 'Your trip'} · ${formatDateRange(meta.startDate, meta.endDate)}`
    : meta.destination ?? 'Your trip'

  const hasActivities = days.some((d) => d.items.length > 0)
  const groups: TimelineGroup[] = []

  // --- Arrival group ---
  const arrival: TimelineGroup = {
    label: dates.length ? formatDayLabel(dates[0]) : undefined,
    items: [],
    addSlots: [],
  }
  if (flights[0]) arrival.items.push(flightItem(flights[0]))
  else arrival.addSlots.push('flights')
  for (const s of stays) arrival.items.push(stayItem(s))
  if (!hasActivities) arrival.addSlots.push('activities')
  groups.push(arrival)

  // --- Activity day groups ---
  days.forEach((d, i) => {
    if (d.items.length === 0) return
    groups.push({
      label: d.date ? formatDayLabel(d.date) : `Day ${i + 1}`,
      items: d.items.map((it) => ({
        kind: 'activity' as const,
        id: it.placeId,
        title: it.name,
        subtitle: it.note,
        bookingStatus: 'not_booked' as const,
      })),
      addSlots: [],
    })
  })

  // --- Return group (only when a second flight exists) ---
  if (flights[1]) {
    groups.push({
      label: dates.length ? formatDayLabel(dates[dates.length - 1]) : 'Return',
      items: [flightItem(flights[1])],
      addSlots: [],
    })
  }

  return { headerLabel, groups }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/trip/timeline.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trip/timeline.ts src/lib/trip/timeline.test.ts
git commit -m "feat(6b): buildTimeline selector sequencing the trip into day groups"
```

---

## Task 4: `computeWatchouts` selector

**Files:**
- Create: `src/lib/trip/watchouts.ts`
- Create: `src/lib/trip/watchouts.test.ts`

Feasible-today rules; extended in 6e once flights/activities carry dates.

- [ ] **Step 1: Write the failing test**

`src/lib/trip/watchouts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeWatchouts } from './watchouts'
import { createTrip } from './tripState'
import type { TripState, Stay } from './types'

const stay = (nights: number): Stay => ({
  id: 's1', name: 'Apt', source: 'airbnb', pricePerNight: 100, nights,
  photos: [], bookUrl: 'x',
})

describe('computeWatchouts', () => {
  it('flags a stay whose nights differ from the trip length', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 2, startDate: '2026-09-01', endDate: '2026-09-15' }, // 14 nights
      stays: [stay(10)],
    }
    const w = computeWatchouts(trip)
    expect(w.some((x) => x.id === 'stay-nights-mismatch' && x.severity === 'warning')).toBe(true)
  })

  it('nudges when a stay exists but no flights are added', () => {
    const trip: TripState = { ...createTrip('t'), meta: { travelers: 1 }, stays: [stay(3)] }
    expect(computeWatchouts(trip).some((x) => x.id === 'no-flights')).toBe(true)
  })

  it('nudges to add a return when only one flight exists', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 1 },
      flights: [{ id: 'f1', from: 'SKP', to: 'TFN', price: 100, stops: 0, bookUrl: 'x' }],
    }
    expect(computeWatchouts(trip).some((x) => x.id === 'one-way')).toBe(true)
  })

  it('returns nothing for a coherent trip', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 2, startDate: '2026-09-01', endDate: '2026-09-15' },
      stays: [stay(14)],
      flights: [
        { id: 'f1', from: 'SKP', to: 'TFN', price: 100, stops: 0, bookUrl: 'x' },
        { id: 'f2', from: 'TFN', to: 'SKP', price: 100, stops: 0, bookUrl: 'y' },
      ],
    }
    expect(computeWatchouts(trip)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/trip/watchouts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `watchouts.ts`**

```ts
import type { TripState } from './types'
import { nightsBetween } from './dates'

export interface WatchoutFix {
  label: string
  prompt: string
}

export interface Watchout {
  id: string
  severity: 'info' | 'warning'
  message: string
  fixes: WatchoutFix[]
}

export function computeWatchouts(trip: TripState): Watchout[] {
  const out: Watchout[] = []
  const { meta, flights, stays } = trip

  // Stay length vs trip length.
  const tripNights = nightsBetween(meta.startDate, meta.endDate)
  if (tripNights !== undefined && stays.length > 0) {
    const stayNights = stays.reduce((n, s) => n + s.nights, 0)
    if (stayNights !== tripNights) {
      out.push({
        id: 'stay-nights-mismatch',
        severity: 'warning',
        message: `Your stay covers ${stayNights} night${stayNights === 1 ? '' : 's'}, but the trip is ${tripNights}.`,
        fixes: [{ label: 'Fix the dates', prompt: 'Adjust my stay dates to match the trip length.' }],
      })
    }
  }

  // Stay but no flights.
  if (stays.length > 0 && flights.length === 0) {
    out.push({
      id: 'no-flights',
      severity: 'info',
      message: "You haven't added flights yet.",
      fixes: [{ label: 'Look up flights', prompt: 'Look up flights for my trip.' }],
    })
  }

  // One-way only.
  if (flights.length === 1) {
    out.push({
      id: 'one-way',
      severity: 'info',
      message: 'Only one flight is added — do you want a return?',
      fixes: [{ label: 'Add a return', prompt: 'Find a return flight for my trip.' }],
    })
  }

  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/trip/watchouts.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trip/watchouts.ts src/lib/trip/watchouts.test.ts
git commit -m "feat(6b): computeWatchouts selector (feasible-today rules)"
```

---

## Task 5: `TimelineItemCard`

**Files:**
- Create: `src/components/itinerary/TimelineItemCard.tsx`
- Create: `src/components/itinerary/TimelineItemCard.test.tsx`

Presentational card for one timeline item: optional thumbnail, title, subtitle, time/date, price, and a `NOT BOOKED` status + `Book on X ↗` outbound link (redirect model).

- [ ] **Step 1: Write the failing test**

`src/components/itinerary/TimelineItemCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineItemCard } from './TimelineItemCard'
import type { TimelineItem } from '@/lib/trip/timeline'

const stay: TimelineItem = {
  kind: 'stay', id: 's1', title: "Guido's Apartments", subtitle: 'Home',
  price: 1462, priceUnit: 'total', thumbnail: 'https://img/x.jpg',
  bookUrl: 'https://airbnb/1', bookLabel: 'Book on Airbnb', bookingStatus: 'not_booked',
}

describe('TimelineItemCard', () => {
  it('renders title, price and a NOT BOOKED status', () => {
    render(<TimelineItemCard item={stay} />)
    expect(screen.getByText("Guido's Apartments")).toBeInTheDocument()
    expect(screen.getByText('$1,462')).toBeInTheDocument()
    expect(screen.getByText(/not booked/i)).toBeInTheDocument()
  })

  it('links out to the provider with a book label', () => {
    render(<TimelineItemCard item={stay} />)
    const link = screen.getByRole('link', { name: /book on airbnb/i })
    expect(link).toHaveAttribute('href', 'https://airbnb/1')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/itinerary/TimelineItemCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `TimelineItemCard.tsx`**

```tsx
import Image from 'next/image'
import type { TimelineItem } from '@/lib/trip/timeline'
import { formatMoney } from '@/lib/ui/format'

const KIND_GLYPH: Record<TimelineItem['kind'], string> = {
  flight: '✈',
  stay: '🏠',
  activity: '🎫',
}

export function TimelineItemCard({ item }: { item: TimelineItem }) {
  const booked = item.bookingStatus === 'booked'
  return (
    <div className="glass flex flex-col gap-2 p-3">
      <div className="flex items-center gap-3">
        {item.thumbnail ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
            <Image src={item.thumbnail} alt="" fill sizes="48px" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sand text-lg">
            {KIND_GLYPH[item.kind]}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
          {item.subtitle && (
            <div className="truncate text-xs font-medium text-muted">{item.subtitle}</div>
          )}
          {(item.timeLabel || item.dateLabel) && (
            <div className="truncate text-xs font-medium text-muted">
              {[item.dateLabel, item.timeLabel].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {item.price !== undefined && (
          <div className="shrink-0 text-right text-sm font-bold text-ink">
            {formatMoney(item.price)}
            {item.priceUnit === 'night' && (
              <span className="block text-[10px] font-medium text-muted">/night</span>
            )}
          </div>
        )}
      </div>

      {item.bookUrl && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={
              'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ' +
              (booked ? 'text-accent-600' : 'text-muted')
            }
          >
            ● {booked ? 'Booked' : 'Not booked'}
          </span>
          <a
            href={item.bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-deep px-3 py-1.5 text-xs font-bold text-white"
          >
            {item.bookLabel ?? 'Book'} ↗
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/itinerary/TimelineItemCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/TimelineItemCard.tsx src/components/itinerary/TimelineItemCard.test.tsx
git commit -m "feat(6b): TimelineItemCard with per-item book status + outbound link"
```

---

## Task 6: `WatchoutBanner`

**Files:**
- Create: `src/components/itinerary/WatchoutBanner.tsx`
- Create: `src/components/itinerary/WatchoutBanner.test.tsx`

Read-only in 6b (fix buttons are wired to chat in 6e). Renders each watch-out with its severity styling; fix labels render as static chips now (no handler yet).

- [ ] **Step 1: Write the failing test**

`src/components/itinerary/WatchoutBanner.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WatchoutBanner } from './WatchoutBanner'
import type { Watchout } from '@/lib/trip/watchouts'

const items: Watchout[] = [
  { id: 'one-way', severity: 'info', message: 'Only one flight is added — do you want a return?', fixes: [{ label: 'Add a return', prompt: 'x' }] },
]

describe('WatchoutBanner', () => {
  it('renders each watch-out message', () => {
    render(<WatchoutBanner watchouts={items} />)
    expect(screen.getByText(/only one flight is added/i)).toBeInTheDocument()
  })

  it('renders nothing when there are no watch-outs', () => {
    const { container } = render(<WatchoutBanner watchouts={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/itinerary/WatchoutBanner.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `WatchoutBanner.tsx`**

```tsx
import type { Watchout } from '@/lib/trip/watchouts'

export function WatchoutBanner({ watchouts }: { watchouts: Watchout[] }) {
  if (watchouts.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {watchouts.map((w) => (
        <div
          key={w.id}
          className={
            'rounded-2xl border px-3 py-2 text-xs font-medium ' +
            (w.severity === 'warning'
              ? 'border-amber-300/70 bg-amber-50 text-amber-900'
              : 'border-accent/30 bg-accent-050 text-ink')
          }
        >
          <div className="flex items-start gap-2">
            <span aria-hidden>{w.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>{w.message}</span>
          </div>
          {w.fixes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {w.fixes.map((f) => (
                <span
                  key={f.label}
                  className="rounded-full border border-hairline bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-ink"
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/itinerary/WatchoutBanner.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/WatchoutBanner.tsx src/components/itinerary/WatchoutBanner.test.tsx
git commit -m "feat(6b): read-only WatchoutBanner"
```

---

## Task 7: `ItineraryView` container

**Files:**
- Create: `src/components/itinerary/ItineraryView.tsx`
- Create: `src/components/itinerary/ItineraryView.test.tsx`

Presentational (no client hooks) so both `/plan` and `/trip/[id]` can render it. Composes: hero
(cover or warm gradient + serif title + `range · N nights · M travelers`), watch-outs, the itinerary
card (header + day groups + item cards + dashed add-slots), and the footer (Trip total + Continue to book).

- [ ] **Step 1: Write the failing test**

`src/components/itinerary/ItineraryView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ItineraryView } from './ItineraryView'
import { createTrip } from '@/lib/trip/tripState'
import type { TripState } from '@/lib/trip/types'

function trip(): TripState {
  return {
    ...createTrip('t1'),
    meta: { travelers: 2, destination: 'Tenerife', title: 'Tenerife Escape', startDate: '2026-09-01', endDate: '2026-09-15' },
    stays: [{ id: 's1', name: 'Apt', source: 'airbnb', pricePerNight: 100, nights: 14, photos: [], bookUrl: 'x' }],
    estimatedTotal: 1400,
  }
}

describe('ItineraryView', () => {
  it('renders the trip title, total, and a flights add-slot', () => {
    render(<ItineraryView trip={trip()} />)
    expect(screen.getByRole('heading', { name: 'Tenerife Escape' })).toBeInTheDocument()
    expect(screen.getByText('$1,400')).toBeInTheDocument()
    expect(screen.getByText(/search flights/i)).toBeInTheDocument()
  })

  it('shows the empty state when nothing is added', () => {
    render(<ItineraryView trip={createTrip('empty')} />)
    expect(screen.getByText(/your trip will appear here/i)).toBeInTheDocument()
  })

  it('surfaces a watch-out (stay nights vs trip length)', () => {
    const t = trip()
    t.stays[0].nights = 10
    render(<ItineraryView trip={t} />)
    expect(screen.getByText(/covers 10 nights/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/itinerary/ItineraryView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ItineraryView.tsx`**

```tsx
import Image from 'next/image'
import type { TripState } from '@/lib/trip/types'
import { buildTimeline, type AddSlot } from '@/lib/trip/timeline'
import { computeWatchouts } from '@/lib/trip/watchouts'
import { nightsBetween } from '@/lib/trip/dates'
import { formatMoney } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { TimelineItemCard } from './TimelineItemCard'
import { WatchoutBanner } from './WatchoutBanner'

const ADD_SLOT_LABEL: Record<AddSlot, string> = {
  flights: '✈  Search flights',
  activities: '🎫  Add things to do',
}

export function ItineraryView({ trip }: { trip: TripState }) {
  const timeline = buildTimeline(trip)
  const watchouts = computeWatchouts(trip)
  const title = trip.meta.title ?? (trip.meta.destination ? `${trip.meta.destination} trip` : 'Your trip')

  const nights = nightsBetween(trip.meta.startDate, trip.meta.endDate)
  const subParts = [
    timeline.headerLabel.includes('·') ? timeline.headerLabel.split('·')[1].trim() : null,
    nights !== undefined ? `${nights} night${nights === 1 ? '' : 's'}` : null,
    `${trip.meta.travelers} traveler${trip.meta.travelers === 1 ? '' : 's'}`,
  ].filter(Boolean)

  const isEmpty =
    trip.flights.length === 0 && trip.stays.length === 0 && trip.days.length === 0

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative h-32 w-full">
          {trip.meta.coverImage ? (
            <Image src={trip.meta.coverImage} alt="" fill sizes="600px" className="object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-accent-050 to-sand" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-deep/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <Heading level={2} className="text-2xl text-white">{title}</Heading>
            {subParts.length > 0 && (
              <div className="mt-0.5 text-xs font-medium text-white/85">{subParts.join(' · ')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        <WatchoutBanner watchouts={watchouts} />

        {isEmpty ? (
          <p className="mt-6 text-center text-sm font-medium text-muted">
            Your trip will appear here as we build it together.
          </p>
        ) : (
          <div className="glass flex flex-col gap-4 p-4">
            <div className="text-sm font-bold text-ink">{timeline.headerLabel}</div>
            {timeline.groups.map((g, gi) => (
              <div key={gi} className="flex flex-col gap-2">
                {g.label && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {g.label}
                  </div>
                )}
                {g.items.map((item) => (
                  <TimelineItemCard key={`${item.kind}-${item.id}`} item={item} />
                ))}
                {g.addSlots.map((slot) => (
                  <div
                    key={slot}
                    className="rounded-2xl border border-dashed border-hairline px-4 py-3 text-sm font-medium text-muted"
                  >
                    {ADD_SLOT_LABEL[slot]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Trip total</div>
          <div className="text-lg font-bold text-ink">{formatMoney(trip.estimatedTotal)}</div>
        </div>
        <button
          type="button"
          className="rounded-2xl bg-deep px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-deep/20 disabled:opacity-50"
          disabled={isEmpty}
        >
          Continue to book →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/itinerary/ItineraryView.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/ItineraryView.tsx src/components/itinerary/ItineraryView.test.tsx
git commit -m "feat(6b): ItineraryView — hero + day groups + add-slots + total/book footer"
```

---

## Task 8: Wire into the planner + shared page; retire the old flat list

**Files:**
- Modify: `src/components/plan/PlanMapToggle.tsx`
- Modify: `src/components/PlannerScreen.tsx`
- Modify: `src/app/trip/[id]/page.tsx`
- Delete: `src/components/plan/PlanView.tsx` + `PlanView.test.tsx`, `FlightCard.tsx` + `FlightCard.test.tsx`, `StayCard.tsx` + `StayCard.test.tsx`, `DayCard.tsx` + `DayCard.test.tsx`

- [ ] **Step 1: Relabel the toggle**

In `PlanMapToggle.tsx`, change only the labels (keep the `'plan' | 'map'` values and all props/aria):

```tsx
      {seg('plan', '📋 Itinerary')}
      {seg('map', '🗺 Map')}
```

Update `PlanMapToggle.test.tsx` if it asserts the old `📋 Plan` label text — change the expected string to `📋 Itinerary` (leave value/aria assertions as-is).

- [ ] **Step 2: Swap `PlanView` → `ItineraryView` in `PlannerScreen.tsx`**

Replace the import `import { PlanView } from './plan/PlanView'` with
`import { ItineraryView } from './itinerary/ItineraryView'`, and in the render swap
`<PlanView trip={trip} />` for `<ItineraryView trip={trip} />`. No other logic changes
(`view === 'plan'` still selects the itinerary; `'map'` still selects `MapView`).

- [ ] **Step 3: Use `ItineraryView` on the shared page**

In `src/app/trip/[id]/page.tsx`, replace `import { PlanView } from '@/components/plan/PlanView'`
with `import { ItineraryView } from '@/components/itinerary/ItineraryView'` and swap
`<PlanView trip={trip} />` → `<ItineraryView trip={trip} />`.

- [ ] **Step 4: Delete the superseded components + tests**

```bash
git rm src/components/plan/PlanView.tsx src/components/plan/PlanView.test.tsx \
       src/components/plan/FlightCard.tsx src/components/plan/FlightCard.test.tsx \
       src/components/plan/StayCard.tsx src/components/plan/StayCard.test.tsx \
       src/components/plan/DayCard.tsx src/components/plan/DayCard.test.tsx
```

- [ ] **Step 5: Verify no dangling imports**

Run: `npm run typecheck`
Expected: no errors. (If anything still imports the deleted files, fix the import.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(6b): render ItineraryView in planner + shared page; retire flat plan cards"
```

---

## Task 9: Full verification + visual review + finish

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all pass. (Net test change: +dates/timeline/watchouts/TimelineItemCard/WatchoutBanner/ItineraryView tests; −PlanView/FlightCard/StayCard/DayCard tests.)

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck`
Run: `rm -rf .next && npm run build`
Expected: both succeed; route table unchanged.

- [ ] **Step 3: Visual review**

`npm run dev`, then drive a plan at `http://localhost:3000/plan?q=Plan%20a%20week%20in%20Tenerife`.
Confirm:
- Hero with serif title + `range · nights · travelers` (warm gradient when no cover).
- Day-grouped itinerary card; outbound flight / stay / dashed **Search flights** + **Add things to do** slots.
- Item cards show thumbnail (stays), price, `● Not booked`, and a navy **Book on X ↗** pill.
- Watch-out banner appears for an incomplete trip (e.g. one-way, or stay-nights mismatch).
- Footer shows **Trip total** + navy **Continue to book →**.
- Toggle reads **📋 Itinerary / 🗺 Map**; Map still works.
- Shared `/trip/{id}` page renders the same itinerary.

- [ ] **Step 4: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** → on "merge locally", merge
`feat/6b-itinerary-pane` into `main`, delete the branch. Update the project memory file to mark 6b complete.

---

## Self-Review

- **Spec coverage:** Implements spec §2.6 itinerary pane, §4.1 (title/cover/bookingStatus + derived `buildTimeline`), §4.4 `computeWatchouts` (feasible subset; §deviation noted), §6 itinerary pane target. Map remains the secondary toggle. ✓
- **Placeholder scan:** Full code for all new modules/components and exact edit instructions for the three wiring modifications + deletions. No TBDs. ✓
- **Type consistency:** `TimelineItem` / `TimelineGroup` / `Timeline` used identically in `timeline.ts`, `TimelineItemCard`, `ItineraryView`; `Watchout` shape shared by `watchouts.ts`, `WatchoutBanner`, tests; `AddSlot` union reused. Selectors are pure and consume the existing `TripState` verbatim. ✓
- **Test reality:** Pure selectors get true red→green unit tests (deterministic UTC dates); components get structural/behavior tests (title, price, book link, add-slot, empty state, watch-out surfacing) — the same jsdom pattern as the rest of the suite. ✓
- **Presentational purity:** `ItineraryView` and children use no client hooks (only `next/image` + links), so the server-rendered `/trip/[id]` page renders them without a client boundary. ✓
