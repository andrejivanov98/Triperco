# Plan 6f — Landing Composer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single free-text hero box with Odessia's **structured composer** — destination + date range + travelers + submit — over a warm serif greeting, plus a row of **category shortcut tiles** (Hotels & homes / Flights / Things to do / Destinations). The composer seeds the planner's trip context so the plan starts already scoped.

**Architecture:** `LandingComposer` collects `dest`/`start`/`end`/`travelers` and navigates to `/plan` with those query params (keeping the existing `q` free-text path). `PlannerScreen` reads them: it seeds `trip.meta` in its `useState` initializer (so the very first request already carries the context) and auto-sends one composed opening message. Category tiles are static gradient tiles that deep-link into `/plan` with a seeded `q`.

**Tech Stack:** Next.js 15 App Router (`useRouter`, `useSearchParams`), TypeScript strict, Tailwind v4 (Sky Glass 2.0), Vitest + RTL.

**Note:** No personalization (no accounts) — the greeting stays generic but warm. Tiles use CSS gradient + emoji glyph (spec §3.5), not bespoke art.

---

## File Structure

- **Create:** `src/components/landing/LandingComposer.tsx` (+ test) — structured composer.
- **Create:** `src/components/landing/CategoryTiles.tsx` (+ test) — 4 shortcut tiles.
- **Modify:** `src/app/page.tsx` — serif greeting + composer + tiles.
- **Modify:** `src/components/PlannerScreen.tsx` — seed meta from params + composed opening message.
- **Delete:** `src/components/landing/HeroPrompt.tsx` + `HeroPrompt.test.tsx` (superseded).

---

## Task 1: `LandingComposer`

**Files:**
- Create: `src/components/landing/LandingComposer.tsx`
- Create: `src/components/landing/LandingComposer.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/landing/LandingComposer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingComposer } from './LandingComposer'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

describe('LandingComposer', () => {
  it('navigates to /plan with the composed query params', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.change(screen.getByPlaceholderText(/where to/i), { target: { value: 'Tenerife' } })
    fireEvent.click(screen.getByRole('button', { name: /add traveler/i }))
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledTimes(1)
    const url = push.mock.calls[0][0] as string
    expect(url).toContain('/plan?')
    expect(url).toContain('dest=Tenerife')
    expect(url).toContain('travelers=2')
  })

  it('still routes to /plan when nothing is entered', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledWith('/plan')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/landing/LandingComposer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `LandingComposer.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LandingComposer() {
  const router = useRouter()
  const [dest, setDest] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [travelers, setTravelers] = useState(1)

  function submit() {
    const params = new URLSearchParams()
    if (dest.trim()) params.set('dest', dest.trim())
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    if (travelers !== 1) params.set('travelers', String(travelers))
    const qs = params.toString()
    router.push(qs ? `/plan?${qs}` : '/plan')
  }

  const field = 'rounded-xl border border-hairline bg-white/60 px-3 py-2 text-sm font-medium text-ink outline-none placeholder:text-muted'

  return (
    <form
      role="form"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="glass flex w-full max-w-xl flex-col gap-3 p-3"
    >
      <input
        value={dest}
        onChange={(e) => setDest(e.target.value)}
        placeholder="Where to? e.g. Tenerife"
        className={`${field} text-base`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start date" className={field} />
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End date" className={field} />
        <div className={`${field} inline-flex items-center gap-3`}>
          <button type="button" aria-label="Remove traveler" onClick={() => setTravelers((n) => Math.max(1, n - 1))}>
            −
          </button>
          <span aria-label="travelers">
            {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
          </span>
          <button type="button" aria-label="Add traveler" onClick={() => setTravelers((n) => n + 1)}>
            +
          </button>
        </div>
        <button
          type="submit"
          className="ml-auto rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white shadow-md shadow-accent/25"
        >
          Plan it →
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/landing/LandingComposer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/LandingComposer.tsx src/components/landing/LandingComposer.test.tsx
git commit -m "feat(6f): structured LandingComposer"
```

---

## Task 2: `CategoryTiles`

**Files:**
- Create: `src/components/landing/CategoryTiles.tsx`
- Create: `src/components/landing/CategoryTiles.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/landing/CategoryTiles.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryTiles } from './CategoryTiles'

describe('CategoryTiles', () => {
  it('renders the four category shortcuts as links into /plan', () => {
    render(<CategoryTiles />)
    for (const label of ['Hotels & homes', 'Flights', 'Things to do', 'Destinations']) {
      const link = screen.getByRole('link', { name: new RegExp(label, 'i') })
      expect(link.getAttribute('href')).toMatch(/^\/plan\?q=/)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/landing/CategoryTiles.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `CategoryTiles.tsx`**

```tsx
import Link from 'next/link'

interface Category {
  label: string
  glyph: string
  prompt: string
  gradient: string
}

const CATEGORIES: Category[] = [
  { label: 'Hotels & homes', glyph: '🏠', prompt: 'Help me find a great place to stay.', gradient: 'from-accent-050 to-sand' },
  { label: 'Flights', glyph: '✈️', prompt: 'Help me find flights for my trip.', gradient: 'from-sand to-accent-050' },
  { label: 'Things to do', glyph: '🎫', prompt: 'Suggest things to do on my trip.', gradient: 'from-accent-050 to-white' },
  { label: 'Destinations', glyph: '🧭', prompt: 'Help me choose where to go.', gradient: 'from-sand to-white' },
]

export function CategoryTiles() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {CATEGORIES.map((c) => (
        <Link
          key={c.label}
          href={`/plan?q=${encodeURIComponent(c.prompt)}`}
          className="glass group flex flex-col gap-2 p-0 overflow-hidden"
        >
          <div className={`flex h-24 w-full items-center justify-center bg-gradient-to-br ${c.gradient} text-3xl transition group-hover:scale-[1.03]`}>
            {c.glyph}
          </div>
          <div className="px-3 pb-3 text-sm font-bold text-ink">{c.label}</div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/landing/CategoryTiles.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/CategoryTiles.tsx src/components/landing/CategoryTiles.test.tsx
git commit -m "feat(6f): CategoryTiles shortcuts"
```

---

## Task 3: Rebuild the landing hero

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/components/landing/HeroPrompt.tsx`, `src/components/landing/HeroPrompt.test.tsx`

- [ ] **Step 1: Swap the hero to the composer + tiles**

Replace `src/app/page.tsx` with:

```tsx
import { LandingComposer } from '@/components/landing/LandingComposer'
import { CategoryTiles } from '@/components/landing/CategoryTiles'
import { SectionRow } from '@/components/landing/SectionRow'
import { DestinationCard } from '@/components/landing/DestinationCard'
import { ExperienceCard } from '@/components/landing/ExperienceCard'
import { Heading } from '@/components/ui/Heading'
import { destinations, experiences } from '@/lib/landing/content'

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 p-6 pb-16">
      <section className="flex flex-col items-center gap-5 pt-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">✦ Triperco</p>
        <Heading level={1} className="max-w-2xl text-4xl text-deep">
          Where are you heading next?
        </Heading>
        <p className="max-w-xl font-medium text-muted">
          Tell Triperco where and when. It finds flights, stays, and things to do — and builds a
          plan you can book yourself.
        </p>
        <div className="mt-1 flex w-full justify-center">
          <LandingComposer />
        </div>
      </section>

      <CategoryTiles />

      <SectionRow title="Featured destinations">
        {destinations.map((d) => (
          <DestinationCard key={d.id} destination={d} />
        ))}
      </SectionRow>

      <SectionRow title="Experiences you won’t forget">
        {experiences.map((e) => (
          <ExperienceCard key={e.id} experience={e} />
        ))}
      </SectionRow>

      <SectionRow title="Places we love">
        {destinations
          .slice()
          .reverse()
          .map((d) => (
            <DestinationCard key={d.id} destination={d} />
          ))}
      </SectionRow>
    </main>
  )
}
```

- [ ] **Step 2: Delete the superseded HeroPrompt**

```bash
git rm src/components/landing/HeroPrompt.tsx src/components/landing/HeroPrompt.test.tsx
```

- [ ] **Step 3: Typecheck (catch any dangling import)**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(6f): landing hero with composer + category tiles"
```

---

## Task 4: Planner reads structured context

**Files:**
- Modify: `src/components/PlannerScreen.tsx`

- [ ] **Step 1: Seed `trip.meta` from params in the `useState` initializer**

Replace the trip state initializer so structured params scope the trip from the first render (which is what `tripRef.current` sends on the opening request):

```tsx
  const [trip, setTrip] = useState<TripState>(() => {
    let t = createTrip('draft')
    const dest = searchParams.get('dest') ?? undefined
    const start = searchParams.get('start') ?? undefined
    const end = searchParams.get('end') ?? undefined
    const travelersRaw = searchParams.get('travelers')
    const travelers = travelersRaw ? Number(travelersRaw) : undefined
    if (dest || start || end || (travelers && travelers > 0)) {
      t = setMeta(t, {
        destination: dest,
        startDate: start,
        endDate: end,
        ...(travelers && travelers > 0 ? { travelers } : {}),
      })
    }
    return t
  })
```

(`setMeta` is already imported from Task 6d.)

- [ ] **Step 2: Compose the opening message from structured params**

Replace the auto-send effect so it fires for either `q` or structured context:

```tsx
  // Auto-send one opening message: the free-text q, or a composed prompt from structured context.
  const sentInitialRef = useRef(false)
  useEffect(() => {
    if (sentInitialRef.current) return
    const q = searchParams.get('q')
    const dest = searchParams.get('dest')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const travelers = searchParams.get('travelers')

    let text: string | null = null
    if (q) {
      text = q
    } else if (dest || start || end || travelers) {
      const parts = [`Plan my trip to ${dest || 'somewhere great'}`]
      if (start && end) parts.push(`from ${start} to ${end}`)
      if (travelers) parts.push(`for ${travelers} travelers`)
      text = parts.join(' ') + '.'
    }
    if (!text) return
    sentInitialRef.current = true
    sendMessage({ text })
  }, [searchParams, sendMessage])
```

(Remove the old `const initialQuery = ...` line and the previous `q`-only effect it fed.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlannerScreen.tsx
git commit -m "feat(6f): planner seeds meta + opening message from landing composer"
```

---

## Task 5: Full verification + visual review + finish

**Files:** none (verification only).

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npm test` → all pass (−HeroPrompt tests, +LandingComposer/CategoryTiles tests).
Run: `npm run typecheck` → clean.
Run: `rm -rf .next && npm run build` → succeeds; route table unchanged.

- [ ] **Step 2: Visual review**

`npm run dev`, open `http://localhost:3000`. Confirm:
- Serif greeting "Where are you heading next?" over the **structured composer** (destination + two date fields + travelers stepper + Plan it).
- A row of four **category tiles** (Hotels & homes / Flights / Things to do / Destinations).
- Submitting the composer lands on `/plan` with the **context bar pre-filled** (destination/dates/travelers) and the assistant opening on that scoped trip.
- Existing curated rows (Featured destinations / Experiences / Places we love) still render and deep-link.
- A category tile opens `/plan` and auto-sends its prompt.

- [ ] **Step 3: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** → on "merge locally", merge `feat/6f-landing-composer` into `main`, delete the branch, update the project memory file to mark 6f complete **and the Odessia-alignment roadmap COMPLETE**.

---

## Self-Review

- **Spec coverage:** Implements spec §6 landing (structured composer: destination + dates + travelers; serif greeting; warm tiles) and wires the composed context into the planner. Completes the 6a–6f roadmap. ✓
- **Placeholder scan:** Full code for both components + the page rewrite, and exact edits for PlannerScreen. No TBDs. ✓
- **Type consistency:** Composer emits `dest`/`start`/`end`/`travelers` query params; PlannerScreen reads exactly those and seeds via the existing `setMeta` reducer; the opening-message composer mirrors them. The `q` free-text path is preserved for tiles + curated cards. ✓
- **First-request correctness:** Seeding meta in the `useState` initializer (not a post-mount effect) guarantees `tripRef.current` already carries the context on the opening request — the message also states it explicitly as a belt-and-braces. ✓
- **Test reality:** Composer/tiles get real red→green tests (router mock + link hrefs); the planner seeding is typechecked + build-verified + visually confirmed. ✓
