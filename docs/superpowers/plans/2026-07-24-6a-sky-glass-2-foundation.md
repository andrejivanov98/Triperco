# Plan 6a — Sky Glass 2.0 (Warm) Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the "Sky Glass" design system into the warm hybrid ("Sky Glass 2.0") — warm neutral canvas, softened glass, Fraunces serif display headings over Inter body — and restyle every existing component to use semantic design tokens, with zero behavior change.

**Architecture:** Introduce Tailwind v4 `@theme` design tokens (colors + font families) in `globals.css`, load Fraunces + Inter as CSS-variable fonts via `next/font/google` in the root layout, soften the shared `.glass` primitive, then migrate each component from hard-coded `slate`/`sky`/`white` utility classes to the new semantic tokens and add `font-display` to display headings.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4 (`@theme`), `next/font/google`, Vitest + React Testing Library (jsdom).

**Verification approach (read first — this phase is a pure visual restyle):** Strict red→green TDD does not fit a token/color pass, so the guardrail for 6a is: **(1) the full existing test suite stays green** (proves no markup/behavior regressed), **(2) `npm run typecheck` passes**, **(3) `npm run build` passes**, **(4) manual visual review** on `localhost`. Two small structural tests are added where they lock real intent (fonts wired to `<body>`; the reusable heading primitive is serif). No sham color-assertion tests.

---

## File Structure

- **Modify:** `src/app/globals.css` — add `@theme` tokens (colors + fonts), warm the canvas, soften `.glass`.
- **Modify:** `src/app/layout.tsx` — load Fraunces + Inter as CSS variables; apply both to `<body>`.
- **Create:** `src/components/ui/Heading.tsx` — small reusable serif display-heading primitive (keeps serif usage consistent).
- **Create:** `src/components/ui/Heading.test.tsx` — structural test for the primitive.
- **Modify (token migration + serif headings):**
  - `src/components/chat/ChatPane.tsx`
  - `src/components/plan/PlanView.tsx`, `FlightCard.tsx`, `StayCard.tsx`, `DayCard.tsx`, `PlanMapToggle.tsx`
  - `src/components/share/ShareButton.tsx`
  - `src/components/landing/HeroPrompt.tsx`, `SectionRow.tsx`, `DestinationCard.tsx`, `ExperienceCard.tsx`
  - `src/components/PlannerScreen.tsx`
  - `src/app/page.tsx`
- **Create:** `src/app/layout.fonts.test.tsx` — asserts the layout exposes both font variables.

### Semantic token reference (used by every migration task)

Defined in `globals.css` `@theme`; these generate Tailwind utilities (`bg-canvas`, `text-ink`, `text-muted`, `text-accent`, `bg-accent`, `border-hairline`, `bg-sand`, `bg-accent-050`, `bg-deep`, `text-deep`, `font-display`).

| Token | Value | Meaning |
|---|---|---|
| `--color-canvas` | `#F4F2EC` | warm paper app background |
| `--color-surface` | `#FBFAF7` | solid warm card alt |
| `--color-ink` | `#1B2430` | all primary text + headings |
| `--color-deep` | `#14213A` | hero display text + the one "commit" pill bg |
| `--color-muted` | `#6B7280` | secondary text |
| `--color-hairline` | `#E7E2D6` | warm hairline borders |
| `--color-sand` | `#ECE6DA` | user chat bubble / static warm chip |
| `--color-accent` | `#0EA5E9` | sky-500 — links, primary CTA, focus, selected |
| `--color-accent-600` | `#0284C7` | accent hover |
| `--color-accent-050` | `#E9F6FE` | soft accent tint (interactive chips) |
| `--font-display` | Fraunces stack | serif display headings |
| `--font-sans` | Inter stack | body / UI |

### Global class-substitution map (apply consistently in every component task)

| Old class | New class |
|---|---|
| `text-slate-900` / `-800` / `-700` | `text-ink` |
| `text-slate-500` / `-400` | `text-muted` |
| `placeholder:text-slate-400` | `placeholder:text-muted` |
| `text-sky-600` / `text-sky-700` (labels/links) | `text-accent` |
| `bg-sky-500` | `bg-accent` |
| `shadow-sky-500/30` | `shadow-accent/25` |
| `border-white/60` | `border-hairline` |
| `bg-white/50` | `bg-white/60` (kept glassy, slightly more opaque) |
| user bubble `bg-sky-100/70 border-sky-200 text-sky-900` | `bg-sand border-hairline text-ink` |
| suggestion/share chip `bg-sky-100/70 border-sky-200 text-sky-700` | `bg-accent-050 border-accent/30 text-accent-600` |
| `bg-sky-100/60 border-sky-200 text-sky-800` (total bar) | `bg-accent-050 border-accent/30 text-ink` |

---

## Task 1: Design tokens, warm canvas, softened glass (`globals.css`)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace the entire file with the token-based version**

```css
@import "tailwindcss";

/* ---- Sky Glass 2.0 (Warm) design tokens ---- */
@theme {
  --color-canvas: #f4f2ec;
  --color-surface: #fbfaf7;
  --color-ink: #1b2430;
  --color-deep: #14213a;
  --color-muted: #6b7280;
  --color-hairline: #e7e2d6;
  --color-sand: #ece6da;
  --color-accent: #0ea5e9;
  --color-accent-600: #0284c7;
  --color-accent-050: #e9f6fe;

  /* next/font exposes these CSS variables (see layout.tsx) */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-fraunces), ui-serif, Georgia, "Times New Roman", serif;
}

:root {
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-border: rgba(255, 255, 255, 0.65);
  --glass-shadow: 0 10px 30px rgba(20, 33, 58, 0.08);
}

body {
  color: var(--color-ink);
  min-height: 100vh;
  background:
    radial-gradient(1100px 600px at 82% -10%, rgba(56, 189, 248, 0.08), transparent 60%),
    var(--color-canvas);
}

/* Frosted "Sky Glass" surface — softened: lighter blur, creamier fill, warm shadow */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
```

- [ ] **Step 2: Verify Tailwind resolves the new utilities (build-level check)**

Run: `npm run build`
Expected: build succeeds. (If a `.next` dir exists from a prior `next dev`, delete it first: `rm -rf .next`.) This confirms `@theme` tokens produce valid utilities before any component references them.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(6a): warm Sky Glass 2.0 tokens + softened glass"
```

---

## Task 2: Load Fraunces + Inter as CSS-variable fonts (`layout.tsx`)

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/layout.fonts.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/app/layout.fonts.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { inter, fraunces } from './layout'

describe('layout fonts', () => {
  it('exposes Inter as the --font-inter CSS variable', () => {
    expect(inter.variable).toBe('--font-inter')
  })

  it('exposes Fraunces as the --font-fraunces CSS variable', () => {
    expect(fraunces.variable).toBe('--font-fraunces')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/app/layout.fonts.test.tsx`
Expected: FAIL — `inter`/`fraunces` are not exported yet.

- [ ] **Step 3: Update the layout to export CSS-variable fonts and apply both to `<body>`**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
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
      <body className={`${inter.variable} ${fraunces.variable} font-sans`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/layout.fonts.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/layout.fonts.test.tsx
git commit -m "feat(6a): load Fraunces serif + Inter as CSS-variable fonts"
```

---

## Task 3: Reusable serif `Heading` primitive

**Files:**
- Create: `src/components/ui/Heading.tsx`
- Create: `src/components/ui/Heading.test.tsx`

Keeps serif-heading usage consistent everywhere (spec §3.3) instead of scattering `font-display` literals.

- [ ] **Step 1: Write the failing test**

`src/components/ui/Heading.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Heading } from './Heading'

describe('Heading', () => {
  it('renders the given level and text as a serif display heading', () => {
    render(<Heading level={2}>Featured destinations</Heading>)
    const h = screen.getByRole('heading', { level: 2, name: 'Featured destinations' })
    expect(h.className).toContain('font-display')
  })

  it('merges extra className', () => {
    render(<Heading level={1} className="text-4xl">Hi</Heading>)
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('text-4xl')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ui/Heading.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the primitive**

`src/components/ui/Heading.tsx`:

```tsx
import type { ReactNode } from 'react'

type Level = 1 | 2 | 3

export function Heading({
  level = 2,
  className = '',
  children,
}: {
  level?: Level
  className?: string
  children: ReactNode
}) {
  const Tag = (`h${level}` as const) as 'h1' | 'h2' | 'h3'
  return (
    <Tag className={`font-display font-semibold tracking-tight text-ink ${className}`.trim()}>
      {children}
    </Tag>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/Heading.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Heading.tsx src/components/ui/Heading.test.tsx
git commit -m "feat(6a): add reusable serif Heading primitive"
```

---

## Task 4: Migrate the landing page to tokens + serif headings

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/landing/SectionRow.tsx`
- Modify: `src/components/landing/HeroPrompt.tsx`
- Modify: `src/components/landing/DestinationCard.tsx`
- Modify: `src/components/landing/ExperienceCard.tsx`

- [ ] **Step 1: Update `SectionRow.tsx` to use the Heading primitive**

Replace the `<h2>` line. New file:

```tsx
import type { ReactNode } from 'react'
import { Heading } from '@/components/ui/Heading'

export function SectionRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Heading level={2} className="px-1 text-lg">{title}</Heading>
      <div className="flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  )
}
```

(The existing `SectionRow.test.tsx` still passes — it asserts a level-2 heading with the title, which `Heading` renders.)

- [ ] **Step 2: Update `page.tsx` hero — serif greeting + tokens**

Replace `src/app/page.tsx` with:

```tsx
import { HeroPrompt } from '@/components/landing/HeroPrompt'
import { SectionRow } from '@/components/landing/SectionRow'
import { DestinationCard } from '@/components/landing/DestinationCard'
import { ExperienceCard } from '@/components/landing/ExperienceCard'
import { Heading } from '@/components/ui/Heading'
import { destinations, experiences } from '@/lib/landing/content'

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 p-6 pb-16">
      <section className="flex flex-col items-center gap-4 pt-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">✦ Triperco</p>
        <Heading level={1} className="max-w-2xl text-4xl text-deep">
          Plan your whole trip in one conversation.
        </Heading>
        <p className="max-w-xl font-medium text-muted">
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

- [ ] **Step 3: Update `HeroPrompt.tsx` tokens**

Apply the substitution map: `text-slate-800`→`text-ink`, `placeholder:text-slate-400`→`placeholder:text-muted`, `bg-sky-500`→`bg-accent`, `shadow-sky-500/30`→`shadow-accent/25`. New file:

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
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-ink outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white shadow-md shadow-accent/25"
      >
        Plan it
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Update the card components' tokens**

In `DestinationCard.tsx` and `ExperienceCard.tsx`, apply the substitution map to any `text-slate-*` / `text-sky-*` / `border-white/*` classes present (title → `text-ink`, blurb/country → `text-muted`, any accent → `text-accent`). Card titles are small — leave them Inter (not serif) for readability; serif is for section/hero/detail headings only. Do **not** change layout, image props, or the `planPrompt` link behavior.

- [ ] **Step 5: Run landing tests + typecheck**

Run: `npx vitest run src/components/landing src/components/ui`
Expected: PASS (SectionRow, DestinationCard, ExperienceCard, HeroPrompt, Heading tests).
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components/landing src/components/ui
git commit -m "feat(6a): warm-token + serif restyle of landing page"
```

---

## Task 5: Migrate the chat pane to tokens

**Files:**
- Modify: `src/components/chat/ChatPane.tsx`

- [ ] **Step 1: Apply the substitution map**

Replace the class strings in `ChatPane.tsx` per the global map:
- brand wordmark `text-sky-600` → `text-accent`
- user bubble `ml-6 rounded-2xl border border-sky-200 bg-sky-100/70 ... text-sky-900` → `ml-6 rounded-2xl border border-hairline bg-sand px-3 py-2 text-sm font-medium text-ink`
- assistant bubble `border-white/60 bg-white/50 ... text-slate-800` → `border-hairline bg-white/60 ... text-ink`
- suggestion chips `border-sky-200 bg-sky-100/70 ... text-sky-700` → `border-accent/30 bg-accent-050 ... text-accent-600`
- input `border-white/60 bg-white/50 ... text-slate-800 ... placeholder:text-slate-400` → `border-hairline bg-white/60 ... text-ink ... placeholder:text-muted`
- send button `bg-sky-500 ... shadow-sky-500/30` → `bg-accent ... shadow-accent/25`

Do not change any props, state, `messageText`, or the `role="form"` / button structure (the existing `ChatPane.test.tsx` must keep passing).

- [ ] **Step 2: Run chat tests**

Run: `npx vitest run src/components/chat`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatPane.tsx
git commit -m "feat(6a): warm-token restyle of chat pane"
```

---

## Task 6: Migrate the plan/itinerary components to tokens + serif

**Files:**
- Modify: `src/components/plan/PlanView.tsx`
- Modify: `src/components/plan/FlightCard.tsx`
- Modify: `src/components/plan/StayCard.tsx`
- Modify: `src/components/plan/DayCard.tsx`
- Modify: `src/components/plan/PlanMapToggle.tsx`

- [ ] **Step 1: Update `PlanView.tsx` — serif destination heading + tokens**

Replace with:

```tsx
import type { TripState } from '@/lib/trip/types'
import { formatMoney } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { FlightCard } from './FlightCard'
import { StayCard } from './StayCard'
import { DayCard } from './DayCard'

export function PlanView({ trip }: { trip: TripState }) {
  const isEmpty =
    trip.flights.length === 0 && trip.stays.length === 0 && trip.days.length === 0

  return (
    <div className="flex h-full flex-col gap-2">
      {trip.meta.destination && (
        <Heading level={2} className="px-1 text-lg">{trip.meta.destination}</Heading>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {trip.flights.map((f) => (
          <FlightCard key={f.id} flight={f} />
        ))}
        {trip.stays.map((s) => (
          <StayCard key={s.id} stay={s} />
        ))}
        {trip.days.map((d, i) => (
          <DayCard key={i} day={d} index={i} />
        ))}
        {isEmpty && (
          <p className="mt-6 text-center text-sm font-medium text-muted">
            Your plan will appear here as we build it together.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-accent/30 bg-accent-050 px-4 py-3 text-sm font-bold text-ink">
        <span>Estimated total</span>
        <span>{formatMoney(trip.estimatedTotal)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `FlightCard.tsx` tokens**

`text-sky-600` (label) → `text-accent`; `text-slate-900` → `text-ink`; `text-slate-500` → `text-muted`; price link `text-sky-600` → `text-accent`. Keep structure and `bookUrl` link intact.

- [ ] **Step 3: Update `StayCard.tsx` tokens**

Same substitutions: label + price link `text-sky-600` → `text-accent`; `text-slate-900` → `text-ink`; `text-slate-500` → `text-muted`; the `/night ↗` sub-label `text-slate-400` → `text-muted`. Keep structure and link intact.

- [ ] **Step 4: Update `DayCard.tsx` tokens**

`text-sky-600` (Day label) → `text-accent`; `text-slate-800` → `text-ink`; note `text-slate-400` → `text-muted`.

- [ ] **Step 5: Update `PlanMapToggle.tsx` tokens**

Apply the map to any `slate`/`sky`/`white` classes: the selected segment should use `bg-accent text-white`, the unselected `text-muted`, container border `border-hairline`. Do not change the `view`/`onChange` props, button labels, or `aria`/role attributes (the existing `PlanMapToggle.test.tsx` must keep passing).

- [ ] **Step 6: Run plan tests + typecheck**

Run: `npx vitest run src/components/plan`
Expected: PASS (FlightCard, StayCard, DayCard, PlanView, PlanMapToggle tests).
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/plan
git commit -m "feat(6a): warm-token + serif restyle of plan components"
```

---

## Task 7: Migrate ShareButton + PlannerScreen to tokens

**Files:**
- Modify: `src/components/share/ShareButton.tsx`
- Modify: `src/components/PlannerScreen.tsx`

- [ ] **Step 1: Update `ShareButton.tsx` tokens**

- share-url input `border-white/60 bg-white/50 ... text-slate-700` → `border-hairline bg-white/60 ... text-ink`
- Copy button `bg-sky-500` → `bg-accent`
- Share button `border-sky-200 bg-sky-100/70 ... text-sky-700` → `border-accent/30 bg-accent-050 ... text-accent-600`

Keep all props, `onShare`, `shareUrl` conditional, and clipboard behavior intact (existing `ShareButton.test.tsx` must pass).

- [ ] **Step 2: Update `PlannerScreen.tsx`**

The `SUGGESTIONS` array, `useChat` wiring, effects, and handlers are unchanged. Only the right-pane container inherits `.glass` (already softened) — no hard-coded color classes to migrate there. Verify there are no residual `slate`/`sky-500`/`white/50` literals; if any exist, apply the map. Do not touch logic.

- [ ] **Step 3: Run share test + typecheck**

Run: `npx vitest run src/components/share`
Expected: PASS.
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/share/ShareButton.tsx src/components/PlannerScreen.tsx
git commit -m "feat(6a): warm-token restyle of share + planner shell"
```

---

## Task 8: Full verification + visual review

**Files:** none (verification only).

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: all tests pass (the prior 87 + Heading (2) + layout.fonts (2) = ~91), 0 failures.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Production build (delete stale `.next` first on Windows)**

Run: `rm -rf .next && npm run build`
Expected: build succeeds; route table matches prior (`/`, `/api/chat`, `/api/trips`, `/api/trips/[id]`, `/plan`, `/trip/[id]`).

- [ ] **Step 4: Visual review**

Run: `npm run dev`, open `http://localhost:3000` and `http://localhost:3000/plan?q=Plan%20a%20weekend%20in%20Rome`. Confirm:
- Warm paper canvas (not cool grey); faint sky glow top-right.
- Serif headings (landing greeting, section titles, destination title); Inter body/UI.
- Softened, creamier glass panes (less heavy blur).
- Sky-blue primary buttons; warm sand user chat bubbles; warm hairline borders.
- No leftover cool-grey/`slate` text or hard sky-100 chips.

- [ ] **Step 5: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** (verify tests → present options → on "merge locally", merge `feat/6a-sky-glass-2` into `main`, delete the branch). Then update the project memory file to mark Plan 6a complete.

---

## Self-Review

- **Spec coverage:** Implements spec §3 (Sky Glass 2.0 tokens, softened glass, Fraunces+Inter, motion/spacing intent via tokens). Behavior, flow, and data model are untouched (those are 6b+). ✓
- **Placeholder scan:** All code steps show full files or exact substitution lists; the substitution map + token table remove ambiguity for the mechanical migrations. ✓
- **Type consistency:** New exports `inter`/`fraunces` (layout), `Heading` primitive with `level: 1|2|3`; token utility names (`text-ink`, `text-muted`, `text-accent`, `bg-accent`, `border-hairline`, `bg-sand`, `bg-accent-050`, `text-deep`, `font-display`) are used identically across all tasks. ✓
- **Test reality:** Existing component tests assert roles/text/behavior, not colors — they stay green through class-only edits, which is exactly the regression guard this visual phase needs. ✓
