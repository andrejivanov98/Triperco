# Triperco 5a — Shareable & Cloneable Trips — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the core product loop — a planned trip can be **shared** via a `/trip/{id}` link and **cloned** ("make it your own") into a fresh editable planner session.

**Architecture:** A persistent `TripStore` (Plan 1's interface) backed by **Upstash Redis** (`@upstash/redis`), with a **memoized in-memory fallback** when Upstash env vars are absent — so it runs locally with zero setup and only needs a real store on deploy. Two API routes (`POST /api/trips`, `GET /api/trips/[id]`) plus a read-only `/trip/[id]` server page and a `?from={id}` seed in `PlannerScreen`. The Redis adapter and store factory are unit-tested with a fake Redis; routes/pages/wiring are typecheck+build-verified (their logic delegates to tested units).

**Tech Stack:** `@upstash/redis`, Next.js route handlers + server component, React 19, existing `TripStore`/serialize helpers from Plan 1, Vitest.

**Scope (5a):** Redis store adapter, store factory, trips API, share button + flow, `/trip/[id]` read-only page, clone-seed. **Out of scope:** the landing page (**Plan 5b**), auth/ownership (trips are unlisted-by-id, anyone with the link can view/clone — matches the anonymous v1 decision), edit-in-place of a shared trip.

> **Storage decision (verified via vercel-storage skill):** `@vercel/kv` is **sunset**; use **Upstash Redis** (`Redis.fromEnv()`, env `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`), provisioned through the Vercel Marketplace (`vercel integration add upstash`) which injects those env vars. No provisioning needed for local dev — the in-memory fallback covers it (non-persistent across server restarts).

---

## File Structure

```
src/lib/share/
  tripStore.ts        # createRedisTripStore(redis) + getTripStore() factory
  tripStore.test.ts
src/components/share/
  ShareButton.tsx     + .test.tsx
src/app/api/trips/
  route.ts            # POST -> { id }
  [id]/route.ts       # GET  -> TripState | 404
src/app/trip/[id]/
  page.tsx            # read-only shared trip + "Make it your own"
src/components/PlannerScreen.tsx   # (modified) share handler + ?from seed
src/app/plan/page.tsx              # (modified) Suspense wrapper for useSearchParams
.env.local.example                 # (modified) add Upstash vars
```

Builds on Plan 1 `src/lib/share/share.ts` (`serializeTrip`, `deserializeTrip`, `newTripId`, `createInMemoryTripStore`, `TripStore`).

---

## Task 1: Install Upstash Redis

- [ ] **Step 1: Install** — Run: `npm install @upstash/redis` — Expected: installs cleanly.
- [ ] **Step 2: Document env** — append to `.env.local.example`:

```bash

# Upstash Redis (shareable trips) — provisioned via Vercel Marketplace.
# Leave unset locally to use the in-memory fallback.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 3: Commit** — `git add -A && git commit -m "chore: add @upstash/redis"`

---

## Task 2: Redis-backed TripStore adapter

**Files:**
- Create: `src/lib/share/tripStore.ts`
- Test: `src/lib/share/tripStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/share/tripStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createRedisTripStore } from './tripStore'
import { createTrip, setMeta } from '../trip/tripState'

// Fake Upstash-like client: set stores the value as-is (objects stay objects),
// get returns it or null — mirroring @upstash/redis auto-(de)serialization.
function fakeRedis() {
  const map = new Map<string, unknown>()
  return {
    map,
    async get(key: string) {
      return map.has(key) ? map.get(key) : null
    },
    async set(key: string, value: unknown) {
      map.set(key, value)
    },
  }
}

describe('createRedisTripStore', () => {
  it('saves under a trip:{id} key and loads it back', async () => {
    const redis = fakeRedis()
    const store = createRedisTripStore(redis)
    const trip = setMeta(createTrip('abc'), { destination: 'Rome' })

    const id = await store.save(trip)
    expect(id).toBe('abc')
    expect(redis.map.has('trip:abc')).toBe(true)

    const loaded = await store.load('abc')
    expect(loaded).toEqual(trip)
  })

  it('returns null for a missing id', async () => {
    const store = createRedisTripStore(fakeRedis())
    expect(await store.load('nope')).toBeNull()
  })

  it('normalizes a JSON string value from redis', async () => {
    const redis = fakeRedis()
    const store = createRedisTripStore(redis)
    const trip = createTrip('str1')
    // Simulate a client that returns the raw JSON string.
    redis.map.set('trip:str1', JSON.stringify(trip))
    expect(await store.load('str1')).toEqual(trip)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test src/lib/share/tripStore.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/share/tripStore.ts`:

```ts
import { Redis } from '@upstash/redis'
import type { TripState } from '../trip/types'
import {
  type TripStore,
  serializeTrip,
  deserializeTrip,
  createInMemoryTripStore,
} from './share'

/** Minimal shape we need from an Upstash-like Redis client. */
export interface RedisLike {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>
}

const KEY_PREFIX = 'trip:'
const TTL_SECONDS = 60 * 60 * 24 * 90 // 90 days

/** A TripStore backed by an Upstash-like Redis client. */
export function createRedisTripStore(redis: RedisLike): TripStore {
  return {
    async save(trip: TripState): Promise<string> {
      await redis.set(`${KEY_PREFIX}${trip.id}`, trip, { ex: TTL_SECONDS })
      return trip.id
    },
    async load(id: string): Promise<TripState | null> {
      const raw = await redis.get(`${KEY_PREFIX}${id}`)
      if (raw == null) return null
      // Upstash may return a parsed object or a raw string depending on how it
      // was stored; normalize both through the validating deserializer.
      return deserializeTrip(typeof raw === 'string' ? raw : serializeTrip(raw as TripState))
    },
  }
}

// Memoized in-memory fallback so local dev sharing works within one server run.
let memoryStore: TripStore | null = null

/**
 * Returns the Upstash-backed store when its env vars are present, otherwise a
 * process-memoized in-memory store (non-persistent across restarts).
 */
export function getTripStore(): TripStore {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Redis.fromEnv() is only constructed when the env vars are present.
    return createRedisTripStore(Redis.fromEnv() as unknown as RedisLike)
  }
  if (!memoryStore) memoryStore = createInMemoryTripStore()
  return memoryStore
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test src/lib/share/tripStore.test.ts` — Expected: PASS (3 tests).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add Redis-backed TripStore + store factory"`

---

## Task 3: Trips API routes

**Files:**
- Create: `src/app/api/trips/route.ts`, `src/app/api/trips/[id]/route.ts`

No unit test (thin glue over the tested store; verified by typecheck/build). `newTripId` and the store are already tested.

- [ ] **Step 1: Write `src/app/api/trips/route.ts`**

```ts
import { getTripStore } from '@/lib/share/tripStore'
import { newTripId } from '@/lib/share/share'
import type { TripState } from '@/lib/trip/types'

// Save a trip and return its shareable id. Always mints a fresh id so sharing
// never overwrites an existing shared trip.
export async function POST(req: Request) {
  const { trip }: { trip: TripState } = await req.json()
  const id = newTripId()
  await getTripStore().save({ ...trip, id })
  return Response.json({ id })
}
```

- [ ] **Step 2: Write `src/app/api/trips/[id]/route.ts`**

```ts
import { getTripStore } from '@/lib/share/tripStore'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trip = await getTripStore().load(id)
  if (!trip) return new Response('Not found', { status: 404 })
  return Response.json(trip)
}
```

- [ ] **Step 3: Typecheck + build** — Run: `npm run typecheck && npm run build` — Expected: both succeed; `/api/trips` and `/api/trips/[id]` listed. (Next 15 route `params` is a Promise — the `await params` above matches.)

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add trips save/load API routes"`

---

## Task 4: ShareButton (presentational)

**Files:**
- Create: `src/components/share/ShareButton.tsx`
- Test: `src/components/share/ShareButton.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/share/ShareButton.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareButton } from './ShareButton'

describe('ShareButton', () => {
  it('calls onShare when clicked', () => {
    const onShare = vi.fn()
    render(<ShareButton onShare={onShare} sharing={false} shareUrl={null} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    expect(onShare).toHaveBeenCalled()
  })

  it('shows the share URL once available', () => {
    render(<ShareButton onShare={() => {}} sharing={false} shareUrl="https://triperco.com/trip/abc" />)
    expect(screen.getByDisplayValue('https://triperco.com/trip/abc')).toBeInTheDocument()
  })

  it('disables the button while sharing', () => {
    render(<ShareButton onShare={() => {}} sharing={true} shareUrl={null} />)
    expect(screen.getByRole('button', { name: /sharing/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test src/components/share/ShareButton.test.tsx` — Expected: FAIL (module not found).

- [ ] **Step 3: Write the component**

Create `src/components/share/ShareButton.tsx`:

```tsx
'use client'

interface ShareButtonProps {
  onShare: () => void
  sharing: boolean
  shareUrl: string | null
}

export function ShareButton({ onShare, sharing, shareUrl }: ShareButtonProps) {
  if (shareUrl) {
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-slate-700"
        />
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(shareUrl)}
          className="shrink-0 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white"
        >
          Copy
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={sharing}
      className="rounded-xl border border-sky-200 bg-sky-100/70 px-3 py-1.5 text-xs font-semibold text-sky-700 disabled:opacity-50"
    >
      {sharing ? 'Sharing…' : 'Share trip'}
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test src/components/share/ShareButton.test.tsx` — Expected: PASS (3 tests).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add ShareButton"`

---

## Task 5: Wire share + clone-seed into PlannerScreen

**Files:**
- Modify: `src/components/PlannerScreen.tsx`
- Modify: `src/app/plan/page.tsx`

No new unit test (its children are tested; fetch wiring is build-verified + live-checked).

- [ ] **Step 1: Replace `src/components/PlannerScreen.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { ShareButton } from './share/ShareButton'

const SUGGESTIONS = ['Plan a weekend in Rome', 'Find me a cheap flight', 'Add a hidden gem']

export function PlannerScreen() {
  const searchParams = useSearchParams()
  const fromId = searchParams.get('from')

  const [trip, setTrip] = useState<TripState>(() => createTrip('draft'))
  const [view, setView] = useState<PlanViewMode>('plan')
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
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

  // Seed from a shared trip when arriving via /plan?from={id}.
  useEffect(() => {
    if (!fromId) return
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/trips/${fromId}`)
      if (!res.ok || cancelled) return
      setTrip((await res.json()) as TripState)
    })()
    return () => {
      cancelled = true
    }
  }, [fromId])

  useEffect(() => {
    const latest = getLatestTrip(messages)
    if (latest) setTrip(latest)
  }, [messages])

  const markers = useMemo(() => tripToMarkers(trip), [trip])

  const handleShare = useCallback(async () => {
    setSharing(true)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trip: tripRef.current }),
      })
      const { id } = (await res.json()) as { id: string }
      setShareUrl(`${window.location.origin}/trip/${id}`)
    } finally {
      setSharing(false)
    }
  }, [])

  return (
    <main className="mx-auto grid h-screen max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(320px,36%)_1fr]">
      <ChatPane
        messages={messages}
        status={status}
        suggestions={messages.length === 0 ? SUGGESTIONS : []}
        onSend={(text) => sendMessage({ text })}
      />

      <div className="glass flex min-h-0 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <PlanMapToggle view={view} onChange={setView} />
          <ShareButton onShare={handleShare} sharing={sharing} shareUrl={shareUrl} />
        </div>
        <div className="min-h-0 flex-1">
          {view === 'plan' ? <PlanView trip={trip} /> : <MapView markers={markers} />}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Replace `src/app/plan/page.tsx`** (wrap in Suspense — `useSearchParams` requires it)

```tsx
import { Suspense } from 'react'
import { PlannerScreen } from '@/components/PlannerScreen'

export default function PlanPage() {
  return (
    <Suspense>
      <PlannerScreen />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build** — Run: `npm run typecheck && npm run build` — Expected: both succeed; `/plan` still listed.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: wire share + clone-seed into planner"`

---

## Task 6: Read-only shared trip page

**Files:**
- Create: `src/app/trip/[id]/page.tsx`

No unit test (server component reading the tested store; verified by typecheck/build + live check).

- [ ] **Step 1: Write `src/app/trip/[id]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTripStore } from '@/lib/share/tripStore'
import { PlanView } from '@/components/plan/PlanView'

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trip = await getTripStore().load(id)
  if (!trip) notFound()

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold tracking-tight text-sky-600">✦ Triperco</div>
        <Link
          href={`/plan?from=${id}`}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/30"
        >
          Make it your own →
        </Link>
      </div>
      <div className="glass min-h-0 flex-1 p-4">
        <PlanView trip={trip} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Typecheck + build** — Run: `npm run typecheck && npm run build` — Expected: both succeed; `/trip/[id]` listed as a dynamic route.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: add read-only shared trip page with clone link"`

---

## Task 7: Final verification

**Files:** none.

- [ ] **Step 1: Typecheck** — `npm run typecheck` — no errors.
- [ ] **Step 2: Full test suite** — `npm test` — PASS (all prior + `tripStore` + `ShareButton`).
- [ ] **Step 3: Build** — `npm run build` — succeeds; `/api/trips`, `/api/trips/[id]`, `/trip/[id]` all listed.
- [ ] **Step 4: Clean tree** — `git status` — nothing to commit.
- [ ] **Step 5 (optional, needs dev server): live check.** `npm run dev`, plan a trip at `/plan`, click **Share trip**, open the copied `/trip/{id}` link in a new tab (read-only plan shows), click **Make it your own** → lands on `/plan` seeded with that trip. Locally this uses the in-memory fallback, so keep the same `npm run dev` process running for the link to resolve. (Manual check, not a gate.)

---

## Definition of done

- `npm run typecheck`, `npm test`, `npm run build` all pass.
- A trip can be shared (`POST /api/trips` → `/trip/{id}`), viewed read-only, and cloned into `/plan?from={id}`.
- The Redis adapter + store factory are unit-tested; routes/pages are build-verified. Works locally via in-memory fallback; uses Upstash when its env vars are present.
- Every task committed.

**Next:** Plan 5b — the curated landing page at `/` (featured destinations, things to do, "Places we love," experiences) that links into `/plan`, replacing the placeholder home. That completes the roadmap.
