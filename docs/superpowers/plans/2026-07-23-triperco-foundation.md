# Triperco Foundation & Domain Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Triperco Next.js app skeleton and build a fully unit-tested domain core (trip state, affiliate links, trip serialization/sharing) that later plans build the agent and UI on top of.

**Architecture:** Next.js (App Router, TypeScript) on Vercel. Pure, framework-agnostic domain logic lives under `src/lib/` as small, focused, immutable modules that are trivial to unit test with Vitest. No React, no network, and no AI in this plan — just a running app shell plus a tested core.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS v4, Vitest, `next/font` (Inter). Package manager: npm. The **Sky Glass** design system (below) is established in the scaffold so every later plan inherits it.

**Scope of this plan (Plan 1 of 5):** project scaffold **including the Sky Glass design tokens**, test harness, `TripState` model + reducer functions, affiliate URL builder, trip serialize/deserialize + in-memory store. **Out of scope here:** SearchApi calls, the chat agent, any UI beyond a token-driven placeholder home page, and real Vercel KV wiring (those are Plans 2–5).

---

## Design System — "Sky Glass" (reference for Task 1)

The full rationale lives in the spec (§15). This is the concrete implementation contract Task 1 must produce, so the aesthetic is consistent from the first commit:

- **Canvas (main background):** light cool grey `#ECEFF3` + a faint sky glow radial-gradient in the top-right.
- **Theme accent:** sky blue — primary `#0EA5E9` (Tailwind `sky-500`), hover `#0284C7` (`sky-600`). Tailwind ships the full `sky-*` palette, so no custom color definitions are needed; components use `text-sky-600`, `bg-sky-500`, etc.
- **Glass primitive:** a single reusable `.glass` class — white at 30% opacity, `backdrop-filter: blur(28px) saturate(160%)`, 1px `rgba(255,255,255,.55)` border, sky-tinted shadow + inset top highlight, radius ~22px.
- **Text:** slate `#0F172A`; muted `#64748B`.
- **Type:** Inter via `next/font/google`, weights 400/500/600/700.

These are defined once in `src/app/globals.css` (tokens + `.glass`) and `src/app/layout.tsx` (font), then reused everywhere.

---

## File Structure

```
Triperco/
  package.json               # deps + scripts
  tsconfig.json              # TS strict + @/* alias
  next.config.ts             # empty Next config
  postcss.config.mjs         # Tailwind v4 postcss plugin
  vitest.config.ts           # Vitest config + @/* alias
  src/
    app/
      layout.tsx             # root layout
      page.tsx               # placeholder home
      globals.css            # Tailwind import
    lib/
      trip/
        types.ts             # TripState, Place, Flight, Stay, ItineraryItem, ...
        tripState.ts         # pure reducer fns + estimatedTotal
        tripState.test.ts
      affiliate/
        affiliate.ts         # buildOutboundUrl(provider, url, config)
        affiliate.test.ts
      share/
        share.ts             # serialize/deserialize, newTripId, in-memory TripStore
        share.test.ts
```

Each `lib` module has one responsibility and no dependency on Next.js, so it can be tested in isolation and reused by the agent (Plan 3) and UI (Plan 4).

---

## Task 1: Scaffold the Next.js app with Sky Glass design tokens

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/globals.css` (Tailwind import + Sky Glass tokens + `.glass` primitive)
- Create: `src/app/layout.tsx` (Inter font via `next/font`)
- Create: `src/app/page.tsx` (token-driven glass hero)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "triperco",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 4: Create `postcss.config.mjs`**

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

- [ ] **Step 5: Create `src/app/globals.css` (Tailwind + Sky Glass tokens + glass primitive)**

```css
@import "tailwindcss";

:root {
  --canvas: #eceff3;
  --glass-bg: rgba(255, 255, 255, 0.30);
  --glass-border: rgba(255, 255, 255, 0.55);
  --glass-shadow: 0 12px 40px rgba(2, 132, 199, 0.10);
  --text: #0f172a;
  --muted: #64748b;
}

body {
  color: var(--text);
  min-height: 100vh;
  background:
    radial-gradient(1100px 600px at 78% -8%, rgba(56, 189, 248, 0.14), transparent 60%),
    var(--canvas);
}

/* Frosted "Sky Glass" surface — the core reusable primitive, used everywhere */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: 22px;
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
```

> Note: Tailwind v4 already provides the full `sky-*` color scale (`text-sky-600`, `bg-sky-500`, …) and `text-slate-*`, so the accent needs no custom config — components reference those utilities directly.

- [ ] **Step 6: Create `src/app/layout.tsx` (Inter font)**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Triperco',
  description: 'AI trip planner — plan your whole trip in one chat.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: Create `src/app/page.tsx` (token-driven glass hero)**

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass max-w-md p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
          Triperco
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Plan your whole trip in one chat.
        </h1>
        <p className="mt-3 font-medium text-slate-500">
          Sky Glass design system — coming to life.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: dependencies install with no errors; `node_modules/` and `package-lock.json` created.

- [ ] **Step 9: Verify the app builds**

Run: `npm run build`
Expected: build succeeds; output ends with a route table listing `/`. (Next.js auto-generates `next-env.d.ts` during this step, and fetches the Inter font.)

- [ ] **Step 10: Visually confirm the Sky Glass look**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: a frosted glass card centered on a light-grey canvas with a faint sky glow top-right, an uppercase sky-blue "Triperco" label, a bold slate headline, and Inter type. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Sky Glass design tokens"
```

---

## Task 2: Set up the Vitest harness

**Files:**
- Create: `vitest.config.ts`
- Test: `src/lib/sanity.test.ts` (temporary, deleted at the end of this task)

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 2: Write a sanity test**

Create `src/lib/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('harness', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 3: Run the sanity test**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 4: Delete the sanity test**

Remove `src/lib/sanity.test.ts` (it existed only to prove the harness works).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Vitest test harness"
```

---

## Task 3: Trip domain types

**Files:**
- Create: `src/lib/trip/types.ts`

This task defines types only (no tests — types are exercised by later tasks).

- [ ] **Step 1: Create `src/lib/trip/types.ts`**

```ts
export interface Coords {
  lat: number
  lng: number
}

export interface ReviewSnippet {
  author?: string
  rating?: number
  text: string
}

export interface Place {
  id: string
  name: string
  coords?: Coords
  category?: string
  rating?: number
  reviewCount?: number
  priceLevel?: number
  photos: string[]
  reviewSnippets: ReviewSnippet[]
  hours?: string
  address?: string
  sourceLinks: { maps?: string; tripadvisor?: string }
}

export interface Flight {
  id: string
  from: string
  to: string
  airline?: string
  departTime?: string
  arriveTime?: string
  durationMinutes?: number
  stops: number
  /** Price per traveler, in the trip's base currency. */
  price: number
  bookUrl: string
}

export interface Stay {
  id: string
  name: string
  source: 'hotel' | 'airbnb'
  coords?: Coords
  rating?: number
  reviewCount?: number
  pricePerNight: number
  nights: number
  photos: string[]
  bookUrl: string
}

export interface ItineraryItem {
  placeId: string
  name: string
  coords?: Coords
  note?: string
}

export interface Day {
  date?: string
  items: ItineraryItem[]
}

export interface TripMeta {
  destination?: string
  startDate?: string
  endDate?: string
  travelers: number
  budget?: number
}

export interface TripState {
  id: string
  meta: TripMeta
  flights: Flight[]
  stays: Stay[]
  days: Day[]
  estimatedTotal: number
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add trip domain types"
```

---

## Task 4: `createTrip` and `computeEstimatedTotal`

**Files:**
- Create: `src/lib/trip/tripState.ts`
- Test: `src/lib/trip/tripState.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/trip/tripState.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createTrip, computeEstimatedTotal } from './tripState'
import type { TripState } from './types'

describe('createTrip', () => {
  it('creates an empty trip with sensible defaults', () => {
    const trip = createTrip('t1')
    expect(trip.id).toBe('t1')
    expect(trip.meta.travelers).toBe(1)
    expect(trip.flights).toEqual([])
    expect(trip.stays).toEqual([])
    expect(trip.days).toEqual([])
    expect(trip.estimatedTotal).toBe(0)
  })
})

describe('computeEstimatedTotal', () => {
  it('sums flights (per traveler) and stays (per night)', () => {
    const trip: TripState = {
      id: 't1',
      meta: { travelers: 2 },
      flights: [
        { id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 180, bookUrl: 'https://a' },
      ],
      stays: [
        {
          id: 's1',
          name: 'Hotel',
          source: 'hotel',
          pricePerNight: 100,
          nights: 3,
          photos: [],
          bookUrl: 'https://b',
        },
      ],
      days: [],
      estimatedTotal: 0,
    }
    // flights: 180 * 2 travelers = 360; stays: 100 * 3 nights = 300 => 660
    expect(computeEstimatedTotal(trip)).toBe(660)
  })

  it('treats travelers below 1 as 1', () => {
    const trip = { ...createTrip('t1'), meta: { travelers: 0 } }
    const withFlight: TripState = {
      ...trip,
      flights: [{ id: 'f1', from: 'A', to: 'B', stops: 0, price: 50, bookUrl: 'https://a' }],
    }
    expect(computeEstimatedTotal(withFlight)).toBe(50)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./tripState` / `createTrip is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/trip/tripState.ts`:

```ts
import type { TripState, TripMeta, Flight, Stay, ItineraryItem } from './types'

export function createTrip(id: string): TripState {
  return {
    id,
    meta: { travelers: 1 },
    flights: [],
    stays: [],
    days: [],
    estimatedTotal: 0,
  }
}

export function computeEstimatedTotal(trip: TripState): number {
  const travelers = trip.meta.travelers > 0 ? trip.meta.travelers : 1
  const flightsTotal =
    trip.flights.reduce((sum, f) => sum + f.price, 0) * travelers
  const staysTotal = trip.stays.reduce(
    (sum, s) => sum + s.pricePerNight * s.nights,
    0,
  )
  return flightsTotal + staysTotal
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add createTrip and computeEstimatedTotal"
```

---

## Task 5: `setMeta` recomputes the total

**Files:**
- Modify: `src/lib/trip/tripState.ts`
- Test: `src/lib/trip/tripState.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/lib/trip/tripState.test.ts`:

```ts
import { setMeta } from './tripState'

describe('setMeta', () => {
  it('patches meta immutably and recomputes the total', () => {
    let trip = createTrip('t1')
    trip = {
      ...trip,
      flights: [{ id: 'f1', from: 'A', to: 'B', stops: 0, price: 100, bookUrl: 'https://a' }],
    }
    const updated = setMeta(trip, { destination: 'Rome', travelers: 3 })
    expect(updated.meta.destination).toBe('Rome')
    expect(updated.meta.travelers).toBe(3)
    expect(updated.estimatedTotal).toBe(300) // 100 * 3
    // original untouched
    expect(trip.meta.destination).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `setMeta is not a function`.

- [ ] **Step 3: Implement `setMeta` and a shared `withTotal` helper**

Add to `src/lib/trip/tripState.ts`:

```ts
function withTotal(trip: TripState): TripState {
  return { ...trip, estimatedTotal: computeEstimatedTotal(trip) }
}

export function setMeta(trip: TripState, patch: Partial<TripMeta>): TripState {
  return withTotal({ ...trip, meta: { ...trip.meta, ...patch } })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add setMeta with total recompute"
```

---

## Task 6: Add/remove flights and stays

**Files:**
- Modify: `src/lib/trip/tripState.ts`
- Test: `src/lib/trip/tripState.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/trip/tripState.test.ts`:

```ts
import { addFlight, removeFlight, addStay, removeStay } from './tripState'
import type { Flight, Stay } from './types'

const sampleFlight: Flight = {
  id: 'f1',
  from: 'SKP',
  to: 'FCO',
  stops: 0,
  price: 180,
  bookUrl: 'https://air',
}

const sampleStay: Stay = {
  id: 's1',
  name: 'Hotel Trastevere',
  source: 'hotel',
  pricePerNight: 110,
  nights: 3,
  photos: [],
  bookUrl: 'https://hotel',
}

describe('flights', () => {
  it('adds a flight and recomputes total', () => {
    const trip = addFlight(createTrip('t1'), sampleFlight)
    expect(trip.flights).toHaveLength(1)
    expect(trip.estimatedTotal).toBe(180) // 1 traveler
  })

  it('removes a flight by id', () => {
    const trip = removeFlight(addFlight(createTrip('t1'), sampleFlight), 'f1')
    expect(trip.flights).toHaveLength(0)
    expect(trip.estimatedTotal).toBe(0)
  })
})

describe('stays', () => {
  it('adds a stay and recomputes total', () => {
    const trip = addStay(createTrip('t1'), sampleStay)
    expect(trip.stays).toHaveLength(1)
    expect(trip.estimatedTotal).toBe(330) // 110 * 3
  })

  it('removes a stay by id', () => {
    const trip = removeStay(addStay(createTrip('t1'), sampleStay), 's1')
    expect(trip.stays).toHaveLength(0)
    expect(trip.estimatedTotal).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `addFlight is not a function`.

- [ ] **Step 3: Implement the four functions**

Add to `src/lib/trip/tripState.ts`:

```ts
export function addFlight(trip: TripState, flight: Flight): TripState {
  return withTotal({ ...trip, flights: [...trip.flights, flight] })
}

export function removeFlight(trip: TripState, flightId: string): TripState {
  return withTotal({
    ...trip,
    flights: trip.flights.filter((f) => f.id !== flightId),
  })
}

export function addStay(trip: TripState, stay: Stay): TripState {
  return withTotal({ ...trip, stays: [...trip.stays, stay] })
}

export function removeStay(trip: TripState, stayId: string): TripState {
  return withTotal({
    ...trip,
    stays: trip.stays.filter((s) => s.id !== stayId),
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add/remove flights and stays"
```

---

## Task 7: Add/remove itinerary items across days

**Files:**
- Modify: `src/lib/trip/tripState.ts`
- Test: `src/lib/trip/tripState.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/trip/tripState.test.ts`:

```ts
import { addItineraryItem, removeItineraryItem } from './tripState'
import type { ItineraryItem } from './types'

const colosseum: ItineraryItem = { placeId: 'p1', name: 'Colosseum' }
const vatican: ItineraryItem = { placeId: 'p2', name: 'Vatican' }

describe('itinerary items', () => {
  it('creates days as needed when adding at an index', () => {
    const trip = addItineraryItem(createTrip('t1'), 1, colosseum)
    expect(trip.days).toHaveLength(2) // day 0 (empty) + day 1
    expect(trip.days[0].items).toEqual([])
    expect(trip.days[1].items[0].name).toBe('Colosseum')
  })

  it('appends multiple items to the same day', () => {
    let trip = addItineraryItem(createTrip('t1'), 0, colosseum)
    trip = addItineraryItem(trip, 0, vatican)
    expect(trip.days[0].items).toHaveLength(2)
  })

  it('removes an item by placeId from a day', () => {
    let trip = addItineraryItem(createTrip('t1'), 0, colosseum)
    trip = addItineraryItem(trip, 0, vatican)
    trip = removeItineraryItem(trip, 0, 'p1')
    expect(trip.days[0].items.map((i) => i.placeId)).toEqual(['p2'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `addItineraryItem is not a function`.

- [ ] **Step 3: Implement both functions**

Add to `src/lib/trip/tripState.ts`:

```ts
export function addItineraryItem(
  trip: TripState,
  dayIndex: number,
  item: ItineraryItem,
): TripState {
  const days = trip.days.map((d) => ({ ...d, items: [...d.items] }))
  while (days.length <= dayIndex) days.push({ items: [] })
  days[dayIndex].items.push(item)
  return withTotal({ ...trip, days })
}

export function removeItineraryItem(
  trip: TripState,
  dayIndex: number,
  placeId: string,
): TripState {
  const days = trip.days.map((d, i) =>
    i === dayIndex
      ? { ...d, items: d.items.filter((it) => it.placeId !== placeId) }
      : d,
  )
  return withTotal({ ...trip, days })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add/remove itinerary items across days"
```

---

## Task 8: Affiliate URL builder

**Files:**
- Create: `src/lib/affiliate/affiliate.ts`
- Test: `src/lib/affiliate/affiliate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/affiliate/affiliate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildOutboundUrl } from './affiliate'

describe('buildOutboundUrl', () => {
  it('adds a Booking.com aid when configured', () => {
    const out = buildOutboundUrl(
      'booking',
      'https://www.booking.com/hotel/it/x.html',
      { bookingAid: '12345' },
    )
    expect(out).toContain('aid=12345')
  })

  it('adds a Travelpayouts marker for flights when configured', () => {
    const out = buildOutboundUrl('flight', 'https://airline.com/book?f=1', {
      travelpayoutsMarker: 'mk99',
    })
    expect(out).toContain('marker=mk99')
    // preserves existing query params
    expect(out).toContain('f=1')
  })

  it('returns the url unchanged for airbnb (no program)', () => {
    const url = 'https://www.airbnb.com/rooms/42'
    expect(buildOutboundUrl('airbnb', url)).toBe(url)
  })

  it('returns the url unchanged for generic with no config', () => {
    const url = 'https://example.com/thing?a=1'
    expect(buildOutboundUrl('generic', url)).toBe(url)
  })
})
```

> Note: `new URL(url).toString()` preserves non-empty paths and query strings unchanged; it only appends `/` when the path is empty (e.g. `https://x.com` → `https://x.com/`). None of the URLs in these tests have an empty path, so they round-trip exactly.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./affiliate`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/affiliate/affiliate.ts`:

```ts
export type Provider = 'booking' | 'airbnb' | 'flight' | 'generic'

export interface AffiliateConfig {
  bookingAid?: string
  travelpayoutsMarker?: string
}

/**
 * Wraps an outbound provider URL with affiliate params where a program exists.
 * Booking.com and Travelpayouts (flights) pay commissions; Airbnb's program is
 * closed, so its links pass through unchanged.
 */
export function buildOutboundUrl(
  provider: Provider,
  targetUrl: string,
  config: AffiliateConfig = {},
): string {
  const url = new URL(targetUrl)
  if (provider === 'booking' && config.bookingAid) {
    url.searchParams.set('aid', config.bookingAid)
  } else if (provider === 'flight' && config.travelpayoutsMarker) {
    url.searchParams.set('marker', config.travelpayoutsMarker)
  }
  return url.toString()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS. If the airbnb/generic normalization assertion fails, fix the test expectation to equal `new URL(url).toString()` for that Node version (the implementation is correct — `URL` round-tripping is the source of truth).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add affiliate outbound URL builder"
```

---

## Task 9: Trip serialization, id generation, and in-memory store

**Files:**
- Create: `src/lib/share/share.ts`
- Test: `src/lib/share/share.test.ts`

This is the framework-agnostic sharing core. The real Vercel KV-backed store is deferred to Plan 5; the `TripStore` interface here lets the agent and UI depend on an abstraction now.

- [ ] **Step 1: Write the failing test**

Create `src/lib/share/share.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  serializeTrip,
  deserializeTrip,
  newTripId,
  createInMemoryTripStore,
} from './share'
import { createTrip, addFlight } from '../trip/tripState'
import type { Flight } from '../trip/types'

const flight: Flight = {
  id: 'f1',
  from: 'SKP',
  to: 'FCO',
  stops: 0,
  price: 180,
  bookUrl: 'https://air',
}

describe('serialize/deserialize', () => {
  it('round-trips a trip', () => {
    const trip = addFlight(createTrip('t1'), flight)
    const restored = deserializeTrip(serializeTrip(trip))
    expect(restored).toEqual(trip)
  })

  it('throws on malformed payloads', () => {
    expect(() => deserializeTrip('{"nope":true}')).toThrow()
  })
})

describe('newTripId', () => {
  it('returns a non-empty unique string', () => {
    const a = newTripId()
    const b = newTripId()
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
  })
})

describe('createInMemoryTripStore', () => {
  it('saves and loads a trip by id', async () => {
    const store = createInMemoryTripStore()
    const trip = addFlight(createTrip('t1'), flight)
    const id = await store.save(trip)
    expect(id).toBe('t1')
    expect(await store.load('t1')).toEqual(trip)
  })

  it('returns null for a missing id', async () => {
    const store = createInMemoryTripStore()
    expect(await store.load('missing')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./share`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/share/share.ts`:

```ts
import type { TripState } from '../trip/types'

export function serializeTrip(trip: TripState): string {
  return JSON.stringify(trip)
}

export function deserializeTrip(json: string): TripState {
  const parsed = JSON.parse(json) as Partial<TripState>
  if (
    !parsed ||
    typeof parsed.id !== 'string' ||
    !Array.isArray(parsed.flights) ||
    !Array.isArray(parsed.stays) ||
    !Array.isArray(parsed.days) ||
    typeof parsed.meta !== 'object'
  ) {
    throw new Error('Invalid trip payload')
  }
  return parsed as TripState
}

export function newTripId(): string {
  return crypto.randomUUID()
}

export interface TripStore {
  save(trip: TripState): Promise<string>
  load(id: string): Promise<TripState | null>
}

/** In-memory store for tests and local dev. Real KV store lands in Plan 5. */
export function createInMemoryTripStore(): TripStore {
  const map = new Map<string, string>()
  return {
    async save(trip) {
      map.set(trip.id, serializeTrip(trip))
      return trip.id
    },
    async load(id) {
      const raw = map.get(id)
      return raw ? deserializeTrip(raw) : null
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add trip serialization, id gen, and in-memory store"
```

---

## Task 10: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck the whole project**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites (trip, affiliate, share) green.

- [ ] **Step 3: Verify a production build**

Run: `npm run build`
Expected: build succeeds with the `/` route listed.

- [ ] **Step 4: Confirm the tree is clean**

Run: `git status`
Expected: nothing to commit, working tree clean (all work committed in earlier tasks).

---

## Definition of done

- `npm run build`, `npm run typecheck`, and `npm test` all pass.
- The app serves a placeholder Triperco home page.
- `src/lib/trip`, `src/lib/affiliate`, and `src/lib/share` are fully unit-tested and have no Next.js/network dependencies.
- Every task is committed.

**Next:** Plan 2 — SearchApi integration layer (server-side wrappers + caching), written after this plan is executed.
