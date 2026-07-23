# Triperco Planner UI 4b — Map View + Plan⇄Map Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the planner screen from the approved design: the right pane gains a **📋 Plan ⇄ 🗺 Map** toggle, and the Map view shows a MapLibre map with a pin per itinerary place/stay, popups on tap.

**Architecture:** A pure `tripToMarkers(trip)` helper turns `TripState` into map markers (unit-tested). `PlanMapToggle` is a presentational segmented control (unit-tested). `MapView` is a client-only component that lazy-imports `maplibre-gl` inside `useEffect` (never on the server), renders markers, and fits bounds — verified by typecheck/build (WebGL can't run in jsdom). `PlannerScreen` gains a `view` state and swaps `PlanView`/`MapView` in the right pane; chat stays fixed on the left.

**Tech Stack:** `maplibre-gl` + free **OpenFreeMap** vector tiles (no API key), React 19, Tailwind (Sky Glass), Vitest + RTL. Builds on Plan 4a.

**Scope (Plan 4b):** `tripToMarkers`, `PlanMapToggle`, `MapView`, and the toggle wiring in `PlannerScreen`. **Out of scope:** landing page + shareable trips (Plan 5), richer map interactions (hover-sync between list and pins), clustering.

> **Map tiles:** uses OpenFreeMap's public `liberty` style (`https://tiles.openfreemap.org/styles/liberty`) — free, keyless, fine for dev/MVP. Swappable for a keyed provider (MapTiler/Mapbox) later by changing one constant. Verify the exact `maplibre-gl` import shape (`(await import('maplibre-gl')).default`) against the installed version during Task 1.

---

## File Structure

```
src/lib/ui/
  mapMarkers.ts        # tripToMarkers(trip) -> MapMarker[]
  mapMarkers.test.ts
src/components/plan/
  PlanMapToggle.tsx    + .test.tsx
  MapView.tsx          # client-only MapLibre map (build-verified)
src/components/
  PlannerScreen.tsx    # (modified) view state + toggle + PlanView/MapView swap
```

---

## Task 1: Install MapLibre

- [ ] **Step 1: Install**

Run: `npm install maplibre-gl`
Expected: installs with no errors.

- [ ] **Step 2: Confirm the import shape**

Run: `node -e "console.log(Object.keys(require('maplibre-gl')))" 2>/dev/null; ls node_modules/maplibre-gl/dist/maplibre-gl.css`
Expected: the CSS file exists. Note whether the default export is used as `maplibregl.Map` (ESM `import maplibregl from 'maplibre-gl'`). If the installed version differs, adjust the dynamic import in Task 4.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: add maplibre-gl"
```

---

## Task 2: tripToMarkers helper

**Files:**
- Create: `src/lib/ui/mapMarkers.ts`
- Test: `src/lib/ui/mapMarkers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/mapMarkers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tripToMarkers } from './mapMarkers'
import { createTrip, addStay, addItineraryItem } from '../trip/tripState'

describe('tripToMarkers', () => {
  it('includes stays and itinerary items that have coords', () => {
    let trip = addStay(createTrip('t1'), {
      id: 's1', name: 'Hotel X', source: 'hotel', coords: { lat: 41.9, lng: 12.5 },
      pricePerNight: 100, nights: 2, photos: [], bookUrl: 'https://x',
    })
    trip = addItineraryItem(trip, 0, { placeId: 'p1', name: 'Colosseum', coords: { lat: 41.89, lng: 12.49 } })
    const markers = tripToMarkers(trip)
    expect(markers).toHaveLength(2)
    expect(markers.map((m) => m.kind).sort()).toEqual(['place', 'stay'])
    const hotel = markers.find((m) => m.kind === 'stay')!
    expect(hotel).toMatchObject({ name: 'Hotel X', lat: 41.9, lng: 12.5 })
  })

  it('skips items without coords', () => {
    const trip = addItineraryItem(createTrip('t1'), 0, { placeId: 'p1', name: 'No coords' })
    expect(tripToMarkers(trip)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/ui/mapMarkers.test.ts`
Expected: FAIL — cannot find module `./mapMarkers`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ui/mapMarkers.ts`:

```ts
import type { TripState } from '../trip/types'

export interface MapMarker {
  id: string
  name: string
  lng: number
  lat: number
  kind: 'stay' | 'place'
}

/** Flatten a trip's stays + itinerary items (those with coords) into map markers. */
export function tripToMarkers(trip: TripState): MapMarker[] {
  const markers: MapMarker[] = []

  for (const stay of trip.stays) {
    if (stay.coords) {
      markers.push({
        id: `stay-${stay.id}`,
        name: stay.name,
        lng: stay.coords.lng,
        lat: stay.coords.lat,
        kind: 'stay',
      })
    }
  }

  trip.days.forEach((day, dayIndex) => {
    for (const item of day.items) {
      if (item.coords) {
        markers.push({
          id: `day${dayIndex}-${item.placeId}`,
          name: item.name,
          lng: item.coords.lng,
          lat: item.coords.lat,
          kind: 'place',
        })
      }
    }
  })

  return markers
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/ui/mapMarkers.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add tripToMarkers helper"
```

---

## Task 3: PlanMapToggle

**Files:**
- Create: `src/components/plan/PlanMapToggle.tsx`
- Test: `src/components/plan/PlanMapToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/plan/PlanMapToggle.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanMapToggle } from './PlanMapToggle'

describe('PlanMapToggle', () => {
  it('renders both segments and marks the active one', () => {
    render(<PlanMapToggle view="plan" onChange={() => {}} />)
    const planBtn = screen.getByRole('button', { name: /plan/i })
    expect(planBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /map/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange when the other segment is clicked', () => {
    const onChange = vi.fn()
    render(<PlanMapToggle view="plan" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /map/i }))
    expect(onChange).toHaveBeenCalledWith('map')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/plan/PlanMapToggle.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/components/plan/PlanMapToggle.tsx`:

```tsx
export type PlanView = 'plan' | 'map'

export function PlanMapToggle({
  view,
  onChange,
}: {
  view: PlanView
  onChange: (view: PlanView) => void
}) {
  const seg = (value: PlanView, label: string) => {
    const active = view === value
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onChange(value)}
        className={
          'rounded-xl px-4 py-1.5 text-xs font-semibold transition ' +
          (active ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-600')
        }
      >
        {label}
      </button>
    )
  }

  return (
    <div className="inline-flex gap-1 rounded-2xl border border-white/60 bg-white/50 p-1">
      {seg('plan', '📋 Plan')}
      {seg('map', '🗺 Map')}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/plan/PlanMapToggle.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PlanMapToggle"
```

---

## Task 4: MapView (client-only MapLibre)

**Files:**
- Create: `src/components/plan/MapView.tsx`

No unit test: MapLibre needs WebGL, which jsdom lacks. Verified by typecheck + build; visually confirmed in the live check (Task 6). The data it renders (`tripToMarkers`) is already unit-tested.

- [ ] **Step 1: Write the component**

Create `src/components/plan/MapView.tsx`:

```tsx
'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { MapMarker } from '@/lib/ui/mapMarkers'

// Free, keyless vector tiles for dev/MVP. Swap for a keyed provider later.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

export function MapView({ markers }: { markers: MapMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any

    void (async () => {
      const maplibregl = (await import('maplibre-gl')).default
      if (cancelled || !container) return

      const first = markers[0]
      map = new maplibregl.Map({
        container,
        style: STYLE_URL,
        center: first ? [first.lng, first.lat] : [12.5, 41.9],
        zoom: first ? 11 : 3,
      })

      const bounds = new maplibregl.LngLatBounds()
      for (const m of markers) {
        new maplibregl.Marker()
          .setLngLat([m.lng, m.lat])
          .setPopup(new maplibregl.Popup({ offset: 24 }).setText(m.name))
          .addTo(map)
        bounds.extend([m.lng, m.lat])
      }
      if (markers.length > 1) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 13 })
      }
    })()

    return () => {
      cancelled = true
      if (map) map.remove()
    }
  }, [markers])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <div ref={containerRef} className="h-full w-full" />
      {markers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-400">
          Add places to your plan to see them on the map.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed. If the `maplibre-gl` default-import shape differs (Task 1), adjust the dynamic import (e.g. `const maplibregl = await import('maplibre-gl')` then use `maplibregl.Map`).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add client-only MapView (MapLibre)"
```

---

## Task 5: Wire the toggle + MapView into PlannerScreen

**Files:**
- Modify: `src/components/PlannerScreen.tsx`

No new unit test (its children are all tested; the wiring is verified by typecheck/build + the live check). This only changes the right pane; the chat pane is untouched.

- [ ] **Step 1: Replace `src/components/PlannerScreen.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { TripState } from '@/lib/trip/types'
import type { TriperUIMessage } from '@/lib/ui/messages'
import { getLatestTrip } from '@/lib/ui/messages'
import { tripToMarkers } from '@/lib/ui/mapMarkers'
import { createTrip } from '@/lib/trip/tripState'
import { ChatPane } from './chat/ChatPane'
import { PlanView } from './plan/PlanView'
import { MapView } from './plan/MapView'
import { PlanMapToggle, type PlanView as PlanViewMode } from './plan/PlanMapToggle'

const SUGGESTIONS = ['Plan a weekend in Rome', 'Find me a cheap flight', 'Add a hidden gem']

export function PlannerScreen() {
  const [trip, setTrip] = useState<TripState>(() => createTrip('draft'))
  const [view, setView] = useState<PlanViewMode>('plan')
  const tripRef = useRef(trip)
  tripRef.current = trip

  const { messages, sendMessage, status } = useChat<TriperUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, trip: tripRef.current },
      }),
    }),
  })

  useEffect(() => {
    const latest = getLatestTrip(messages)
    if (latest) setTrip(latest)
  }, [messages])

  const markers = useMemo(() => tripToMarkers(trip), [trip])

  return (
    <main className="mx-auto grid h-screen max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(320px,36%)_1fr]">
      <ChatPane
        messages={messages}
        status={status}
        suggestions={messages.length === 0 ? SUGGESTIONS : []}
        onSend={(text) => sendMessage({ text })}
      />

      <div className="glass flex min-h-0 flex-col gap-3 p-4">
        <PlanMapToggle view={view} onChange={setView} />
        <div className="min-h-0 flex-1">
          {view === 'plan' ? <PlanView trip={trip} /> : <MapView markers={markers} />}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed; `/plan` still listed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Plan/Map toggle to the planner right pane"
```

---

## Task 6: Final verification

**Files:** none.

- [ ] **Step 1: Typecheck** — Run: `npm run typecheck` — Expected: no errors.
- [ ] **Step 2: Full test suite** — Run: `npm test` — Expected: PASS (all prior suites + `tripToMarkers` + `PlanMapToggle`).
- [ ] **Step 3: Build** — Run: `npm run build` — Expected: succeeds; `/plan` listed.
- [ ] **Step 4: Clean tree** — Run: `git status` — Expected: nothing to commit.
- [ ] **Step 5 (optional, needs keys + dev server): live check.** `npm run dev`, open `/plan`, plan a trip with a hotel + a couple of places, then click **🗺 Map** — expect a map with a pin per stay/place, popups on click, bounds fit to the trip. (Manual confidence check, not a gate.)

---

## Definition of done

- `npm run typecheck`, `npm test`, `npm run build` all pass.
- The `/plan` right pane toggles between the Plan list and a MapLibre map with a pin per stay/place.
- `tripToMarkers` and `PlanMapToggle` are unit-tested; `MapView` is build-verified (WebGL can't run in jsdom).
- Every task committed.

**Next:** Plan 5 — landing page (curated destinations/experiences) + shareable/cloneable trips backed by Vercel KV, replacing the placeholder `/` home.
