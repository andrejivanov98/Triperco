# Triperco 5b — Landing Page (Curated Seed) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder home `/` with the Odessia-style Sky-Glass landing page: a hero + prompt box and curated sections (Featured destinations, Things to do, Places we love, Experiences), all linking into `/plan`.

**Architecture:** A curated static seed module (`src/lib/landing/content.ts`) holds hand-picked destinations/experiences (title, blurb, image, and a `planPrompt` used to pre-seed the chat). Small presentational components render sections from that data. The hero prompt box is a client component that routes to `/plan?q={prompt}`; `PlannerScreen` reads `q` and auto-sends it as the first message. The page at `/` is a server component composing hero + sections. Everything is prop-driven and unit-tested; no network, no per-visit SearchApi cost.

**Tech Stack:** Next.js server + client components, React 19, Tailwind (Sky Glass), `next/image`, `next/navigation`, Vitest + RTL. Builds on Plans 1–5a.

**Scope (5b):** curated content module + accessor, `DestinationCard`/`ExperienceCard`, `SectionRow`, `HeroPrompt`, the `/` page, and reading `?q=` in `PlannerScreen`. **Out of scope:** live-search landing content, a CMS, per-user personalization, images hosted anywhere but the referenced remote URLs (config added here).

> **Content source (per spec + user decision):** curated static seed, not live SearchApi. Images use royalty-free Unsplash URLs referenced remotely (allowed via `next.config` `images.remotePatterns`). The `planPrompt` on each item is what pre-seeds the planner, connecting discovery → planning.

---

## File Structure

```
src/lib/landing/
  content.ts            # Destination[] + Experience[] seed data + getters
  content.test.ts
src/components/landing/
  DestinationCard.tsx   + .test.tsx
  ExperienceCard.tsx    + .test.tsx
  SectionRow.tsx        + .test.tsx
  HeroPrompt.tsx        + .test.tsx   # 'use client' — prompt box -> /plan?q=
src/app/page.tsx        # (replaced) landing page composition
src/components/PlannerScreen.tsx   # (modified) read ?q= and auto-send first message
next.config.ts          # (modified) images.remotePatterns for Unsplash
```

---

## Task 1: Allow remote images

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
}

export default nextConfig
```

- [ ] **Step 2: Verify build** — Run: `rm -rf .next && npm run build` — Expected: succeeds.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "chore: allow Unsplash remote images"`

---

## Task 2: Curated content seed

**Files:**
- Create: `src/lib/landing/content.ts`
- Test: `src/lib/landing/content.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/landing/content.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { destinations, experiences, allLandingItems } from './content'

describe('landing content', () => {
  it('has several destinations, each fully populated', () => {
    expect(destinations.length).toBeGreaterThanOrEqual(4)
    for (const d of destinations) {
      expect(d.id).toBeTruthy()
      expect(d.title).toBeTruthy()
      expect(d.blurb).toBeTruthy()
      expect(d.image).toMatch(/^https:\/\//)
      expect(d.planPrompt.toLowerCase()).toContain(d.title.toLowerCase())
    }
  })

  it('has experiences, each fully populated', () => {
    expect(experiences.length).toBeGreaterThanOrEqual(4)
    for (const e of experiences) {
      expect(e.id).toBeTruthy()
      expect(e.title).toBeTruthy()
      expect(e.image).toMatch(/^https:\/\//)
      expect(e.planPrompt).toBeTruthy()
    }
  })

  it('exposes unique ids across all items', () => {
    const ids = allLandingItems().map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test src/lib/landing/content.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

Create `src/lib/landing/content.ts`:

```ts
export interface Destination {
  id: string
  title: string
  country: string
  blurb: string
  image: string
  planPrompt: string
}

export interface Experience {
  id: string
  title: string
  blurb: string
  image: string
  planPrompt: string
}

// Unsplash images referenced remotely (see next.config images.remotePatterns).
const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`

export const destinations: Destination[] = [
  {
    id: 'rome',
    title: 'Rome',
    country: 'Italy',
    blurb: 'Ancient wonders, timeless piazzas, and the best carbonara of your life.',
    image: IMG('photo-1552832230-c0197dd311b5'),
    planPrompt: 'Plan a 4-day trip to Rome with must-see sights and great food.',
  },
  {
    id: 'lisbon',
    title: 'Lisbon',
    country: 'Portugal',
    blurb: 'Tiled facades, tram rides, and sunset views over the Tagus.',
    image: IMG('photo-1585208798174-6cedd86e019a'),
    planPrompt: 'Plan a 4-day trip to Lisbon with viewpoints, food, and a day trip.',
  },
  {
    id: 'kyoto',
    title: 'Kyoto',
    country: 'Japan',
    blurb: 'Temples, bamboo groves, and quiet gardens between the neon.',
    image: IMG('photo-1493976040374-85c8e12f0c0e'),
    planPrompt: 'Plan a 5-day trip to Kyoto with temples, gardens, and local food.',
  },
  {
    id: 'barcelona',
    title: 'Barcelona',
    country: 'Spain',
    blurb: 'Gaudí’s dreamscapes, beach afternoons, and late tapas nights.',
    image: IMG('photo-1583422409516-2895a77efded'),
    planPrompt: 'Plan a 4-day trip to Barcelona with Gaudí sights, beach time, and tapas.',
  },
  {
    id: 'ohrid',
    title: 'Ohrid',
    country: 'North Macedonia',
    blurb: 'A lakeside old town, hilltop churches, and slow summer evenings.',
    image: IMG('photo-1600298881974-6be191ceeda1'),
    planPrompt: 'Plan a 3-day trip to Ohrid with the old town, the lake, and viewpoints.',
  },
]

export const experiences: Experience[] = [
  {
    id: 'northern-lights',
    title: 'Chase the northern lights',
    blurb: 'A winter week under the aurora in Norwegian Lapland.',
    image: IMG('photo-1483347756197-71ef80e95f73'),
    planPrompt: 'Plan a 5-day northern lights trip to Tromsø, Norway in winter.',
  },
  {
    id: 'amalfi-drive',
    title: 'Drive the Amalfi Coast',
    blurb: 'Cliffside villages, lemon groves, and endless sea views.',
    image: IMG('photo-1533165850316-4dc8f0aa2c1c'),
    planPrompt: 'Plan a 5-day Amalfi Coast road trip with the best coastal towns.',
  },
  {
    id: 'safari',
    title: 'Go on safari',
    blurb: 'Dawn game drives and starlit camps in the Serengeti.',
    image: IMG('photo-1516426122078-c23e76319801'),
    planPrompt: 'Plan a 6-day safari in the Serengeti, Tanzania.',
  },
  {
    id: 'greek-islands',
    title: 'Island-hop the Cyclades',
    blurb: 'Whitewashed towns and ferry rides across the Aegean.',
    image: IMG('photo-1533105079780-92b9be482077'),
    planPrompt: 'Plan a 7-day Greek island-hopping trip through the Cyclades.',
  },
]

/** All landing items flattened — used for id-uniqueness checks and testing. */
export function allLandingItems(): { id: string }[] {
  return [...destinations, ...experiences]
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test src/lib/landing/content.test.ts` — Expected: PASS (3 tests).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add curated landing content seed"`

---

## Task 3: DestinationCard + ExperienceCard

**Files:**
- Create: `src/components/landing/DestinationCard.tsx`, `src/components/landing/ExperienceCard.tsx`
- Test: matching `.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/landing/DestinationCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DestinationCard } from './DestinationCard'
import type { Destination } from '@/lib/landing/content'

const dest: Destination = {
  id: 'rome', title: 'Rome', country: 'Italy',
  blurb: 'Ancient wonders.', image: 'https://images.unsplash.com/x?w=800',
  planPrompt: 'Plan a 4-day trip to Rome.',
}

describe('DestinationCard', () => {
  it('shows title + country and links to /plan with the prompt', () => {
    render(<DestinationCard destination={dest} />)
    expect(screen.getByText('Rome')).toBeInTheDocument()
    expect(screen.getByText('Italy')).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toContain('/plan?q=')
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain('Plan a 4-day trip to Rome.')
  })
})
```

Create `src/components/landing/ExperienceCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExperienceCard } from './ExperienceCard'
import type { Experience } from '@/lib/landing/content'

const exp: Experience = {
  id: 'safari', title: 'Go on safari', blurb: 'Dawn game drives.',
  image: 'https://images.unsplash.com/y?w=800', planPrompt: 'Plan a 6-day safari.',
}

describe('ExperienceCard', () => {
  it('shows title and links to /plan with the prompt', () => {
    render(<ExperienceCard experience={exp} />)
    expect(screen.getByText('Go on safari')).toBeInTheDocument()
    expect(screen.getByRole('link').getAttribute('href')).toContain('/plan?q=')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail** — Run: `npm test src/components/landing/DestinationCard.test.tsx src/components/landing/ExperienceCard.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Write the components**

Create `src/components/landing/DestinationCard.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Destination } from '@/lib/landing/content'

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={`/plan?q=${encodeURIComponent(destination.planPrompt)}`}
      className="glass group block w-64 shrink-0 overflow-hidden p-0"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={destination.image}
          alt={destination.title}
          fill
          sizes="256px"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-sky-600">
          {destination.country}
        </div>
        <div className="text-sm font-bold text-slate-900">{destination.title}</div>
        <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">
          {destination.blurb}
        </p>
      </div>
    </Link>
  )
}
```

Create `src/components/landing/ExperienceCard.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Experience } from '@/lib/landing/content'

export function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <Link
      href={`/plan?q=${encodeURIComponent(experience.planPrompt)}`}
      className="group relative block h-56 w-72 shrink-0 overflow-hidden rounded-[22px]"
    >
      <Image
        src={experience.image}
        alt={experience.title}
        fill
        sizes="288px"
        className="object-cover transition group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="text-sm font-bold text-white">{experience.title}</div>
        <p className="mt-0.5 line-clamp-2 text-xs font-medium text-white/80">
          {experience.blurb}
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass** — Run: `npm test src/components/landing/DestinationCard.test.tsx src/components/landing/ExperienceCard.test.tsx` — Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add DestinationCard and ExperienceCard"`

---

## Task 4: SectionRow

**Files:**
- Create: `src/components/landing/SectionRow.tsx`
- Test: `src/components/landing/SectionRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/landing/SectionRow.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionRow } from './SectionRow'

describe('SectionRow', () => {
  it('renders a heading and its children', () => {
    render(
      <SectionRow title="Places we love">
        <div>child A</div>
        <div>child B</div>
      </SectionRow>,
    )
    expect(screen.getByRole('heading', { name: 'Places we love' })).toBeInTheDocument()
    expect(screen.getByText('child A')).toBeInTheDocument()
    expect(screen.getByText('child B')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test src/components/landing/SectionRow.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Write the component**

Create `src/components/landing/SectionRow.tsx`:

```tsx
import type { ReactNode } from 'react'

export function SectionRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-lg font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test src/components/landing/SectionRow.test.tsx` — Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add SectionRow"`

---

## Task 5: HeroPrompt

**Files:**
- Create: `src/components/landing/HeroPrompt.tsx`
- Test: `src/components/landing/HeroPrompt.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/landing/HeroPrompt.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { HeroPrompt } from './HeroPrompt'

describe('HeroPrompt', () => {
  it('routes to /plan?q= with the typed prompt on submit', () => {
    push.mockClear()
    render(<HeroPrompt />)
    fireEvent.change(screen.getByPlaceholderText(/where to/i), {
      target: { value: 'A week in Japan' },
    })
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledWith(`/plan?q=${encodeURIComponent('A week in Japan')}`)
  })

  it('routes to bare /plan when the prompt is empty', () => {
    push.mockClear()
    render(<HeroPrompt />)
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledWith('/plan')
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test src/components/landing/HeroPrompt.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Write the component**

Create `src/components/landing/HeroPrompt.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HeroPrompt() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')

  return (
    <form
      role="form"
      onSubmit={(e) => {
        e.preventDefault()
        const q = prompt.trim()
        router.push(q ? `/plan?q=${encodeURIComponent(q)}` : '/plan')
      }}
      className="glass flex w-full max-w-xl items-center gap-2 p-2"
    >
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Where to? e.g. “A relaxed week in Japan”"
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-sky-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/30"
      >
        Plan it
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test src/components/landing/HeroPrompt.test.tsx` — Expected: PASS (2 tests).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add HeroPrompt"`

---

## Task 6: Landing page at /

**Files:**
- Modify: `src/app/page.tsx`

No unit test (server composition of tested components; verified by build + live check).

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import { HeroPrompt } from '@/components/landing/HeroPrompt'
import { SectionRow } from '@/components/landing/SectionRow'
import { DestinationCard } from '@/components/landing/DestinationCard'
import { ExperienceCard } from '@/components/landing/ExperienceCard'
import { destinations, experiences } from '@/lib/landing/content'

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 p-6 pb-16">
      <section className="flex flex-col items-center gap-4 pt-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">✦ Triperco</p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900">
          Plan your whole trip in one conversation.
        </h1>
        <p className="max-w-xl font-medium text-slate-500">
          Tell Triperco where you want to go. It finds flights, stays, and things to do —
          and builds a plan you can book yourself.
        </p>
        <div className="mt-2 flex w-full justify-center">
          <HeroPrompt />
        </div>
      </section>

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

- [ ] **Step 2: Build** — Run: `rm -rf .next && npm run build` — Expected: succeeds; `/` is static.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: replace placeholder home with landing page"`

---

## Task 7: PlannerScreen reads ?q= and auto-sends

**Files:**
- Modify: `src/components/PlannerScreen.tsx`

No new unit test (wiring over tested pieces; build + live-verified). Only adds a one-shot auto-send effect.

- [ ] **Step 1: Add the auto-send effect**

In `src/components/PlannerScreen.tsx`, add `q` alongside the existing `fromId`:

```tsx
  const fromId = searchParams.get('from')
  const initialQuery = searchParams.get('q')
```

Then add this effect after the existing `fromId` seed effect (a `useRef` guard ensures it fires once):

```tsx
  const sentInitialRef = useRef(false)
  useEffect(() => {
    if (!initialQuery || sentInitialRef.current) return
    sentInitialRef.current = true
    sendMessage({ text: initialQuery })
  }, [initialQuery, sendMessage])
```

> Note: `tripRef` already uses `useRef`; this adds a separate `sentInitialRef`. Keep both. The effect deliberately depends only on `initialQuery`/`sendMessage` and self-guards so navigations that keep `?q=` don't re-send.

- [ ] **Step 2: Typecheck + build** — Run: `npm run typecheck && rm -rf .next && npm run build` — Expected: both succeed.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: auto-send landing prompt via /plan?q="`

---

## Task 8: Final verification

**Files:** none.

- [ ] **Step 1: Typecheck** — `npm run typecheck` — no errors.
- [ ] **Step 2: Full test suite** — `npm test` — PASS (all prior + landing content + 4 landing components).
- [ ] **Step 3: Build** — `rm -rf .next && npm run build` — succeeds; `/` static, `/plan`, `/trip/[id]`, all API routes listed.
- [ ] **Step 4: Clean tree** — `git status` — nothing to commit.
- [ ] **Step 5 (optional, needs dev server + keys): live check.** `npm run dev`, open `/` — hero + three curated rows render with images; click a destination → lands on `/plan` and the chat auto-sends that destination's prompt; type in the hero box and submit → same. (Manual check, not a gate.)

---

## Definition of done

- `npm run typecheck`, `npm test`, `npm run build` all pass.
- `/` is the curated Sky-Glass landing page (hero prompt + Featured destinations + Experiences + Places we love), replacing the placeholder.
- Clicking any card or submitting the hero prompt opens `/plan` and auto-starts planning with that prompt.
- Content seed + all four landing components are unit-tested; page + wiring are build-verified.
- Every task committed.

**This completes the Triperco v1 roadmap** (Plans 1–5b): foundation → SearchApi → agent → planner UI (chat/plan/map) → share/clone → landing page. Natural follow-ups (not in v1): deploy to Vercel + provision Upstash, Plan 2b (Airbnb/Tripadvisor/Explore tools), live-search landing, richer map interactions.
