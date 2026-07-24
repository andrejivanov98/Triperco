# Plan 6e — Watch-outs & Fix Flows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only watch-outs banner into Odessia's **watch-out → fix** loop: each flagged issue offers **actionable buttons** that send the fix as a chat message, and add one more feasible rule (over-budget). The assistant is nudged to acknowledge and resolve flagged conflicts.

**Architecture:** `computeWatchouts` (pure, from 6b) gains an `over-budget` rule. `WatchoutBanner` takes an optional `onFix(prompt)` — when present, fix chips become buttons that call it; when absent (the read-only shared `/trip/[id]` page) they stay static. `ItineraryView` forwards `onFix`; `PlannerScreen` wires it to `sendMessage`, reusing the same send path as menus/forms from 6d.

**Tech Stack:** TypeScript strict, Tailwind v4 (Sky Glass 2.0), Vitest + RTL.

**Data-reality note (deviation from spec §7):** Odessia-style date-conflict rules (e.g. "arrive Sep 2 but stay starts Sep 1") need dated flights and per-day dates that the tools don't reliably set yet, so those specific rules stay deferred. 6e ships rules that fire on today's data (stay-nights mismatch, no-flights, one-way, **over-budget**) and makes them all actionable — the valuable half of the loop.

---

## File Structure

- **Modify:** `src/lib/trip/watchouts.ts` (+ `watchouts.test.ts`) — add the `over-budget` rule.
- **Modify:** `src/components/itinerary/WatchoutBanner.tsx` (+ `WatchoutBanner.test.tsx`) — optional `onFix`, actionable fix buttons.
- **Modify:** `src/components/itinerary/ItineraryView.tsx` (+ `ItineraryView.test.tsx`) — forward `onFix`.
- **Modify:** `src/components/PlannerScreen.tsx` — pass `onFix` → `sendMessage`.
- **Modify:** `src/lib/ai/systemPrompt.ts` (+ `systemPrompt.test.ts`) — line about resolving flagged watch-outs.

---

## Task 1: `over-budget` watch-out rule

**Files:**
- Modify: `src/lib/trip/watchouts.ts`
- Modify: `src/lib/trip/watchouts.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/trip/watchouts.test.ts`:

```ts
describe('over-budget', () => {
  it('warns when the estimated total exceeds the budget', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 2, budget: 1000 },
      estimatedTotal: 1500,
    }
    const w = computeWatchouts(trip)
    expect(w.some((x) => x.id === 'over-budget' && x.severity === 'warning')).toBe(true)
  })

  it('does not warn when within budget', () => {
    const trip: TripState = {
      ...createTrip('t'),
      meta: { travelers: 2, budget: 2000 },
      estimatedTotal: 1500,
    }
    expect(computeWatchouts(trip).some((x) => x.id === 'over-budget')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/trip/watchouts.test.ts`
Expected: FAIL — no `over-budget` watch-out yet.

- [ ] **Step 3: Implement the rule**

In `src/lib/trip/watchouts.ts`, before `return out`, add:

```ts
  // Over budget.
  if (meta.budget !== undefined && meta.budget > 0 && trip.estimatedTotal > meta.budget) {
    out.push({
      id: 'over-budget',
      severity: 'warning',
      message: `Your plan is ${(trip.estimatedTotal - meta.budget).toLocaleString()} over your budget.`,
      fixes: [{ label: 'Find cheaper options', prompt: 'Suggest cheaper flights or stays to get back under my budget.' }],
    })
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/trip/watchouts.test.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trip/watchouts.ts src/lib/trip/watchouts.test.ts
git commit -m "feat(6e): over-budget watch-out rule"
```

---

## Task 2: Actionable `WatchoutBanner`

**Files:**
- Modify: `src/components/itinerary/WatchoutBanner.tsx`
- Modify: `src/components/itinerary/WatchoutBanner.test.tsx`

- [ ] **Step 1: Update the test**

Replace `src/components/itinerary/WatchoutBanner.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WatchoutBanner } from './WatchoutBanner'
import type { Watchout } from '@/lib/trip/watchouts'

const items: Watchout[] = [
  { id: 'one-way', severity: 'info', message: 'Only one flight is added — do you want a return?', fixes: [{ label: 'Add a return', prompt: 'Find a return flight for my trip.' }] },
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

  it('sends the fix prompt when a fix button is clicked (onFix provided)', () => {
    const onFix = vi.fn()
    render(<WatchoutBanner watchouts={items} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a return' }))
    expect(onFix).toHaveBeenCalledWith('Find a return flight for my trip.')
  })

  it('renders fixes as static chips (no buttons) when onFix is absent', () => {
    render(<WatchoutBanner watchouts={items} />)
    expect(screen.queryByRole('button', { name: 'Add a return' })).toBeNull()
    expect(screen.getByText('Add a return')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/itinerary/WatchoutBanner.test.tsx`
Expected: FAIL — `onFix` not supported; fixes are always static spans.

- [ ] **Step 3: Implement the optional `onFix`**

Replace the fixes block (and the component signature) in `WatchoutBanner.tsx`:

```tsx
import type { Watchout } from '@/lib/trip/watchouts'

export function WatchoutBanner({
  watchouts,
  onFix,
}: {
  watchouts: Watchout[]
  onFix?: (prompt: string) => void
}) {
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
              {w.fixes.map((f) =>
                onFix ? (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => onFix(f.prompt)}
                    className="rounded-full border border-hairline bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-white"
                  >
                    {f.label}
                  </button>
                ) : (
                  <span
                    key={f.label}
                    className="rounded-full border border-hairline bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-ink"
                  >
                    {f.label}
                  </span>
                ),
              )}
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
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/WatchoutBanner.tsx src/components/itinerary/WatchoutBanner.test.tsx
git commit -m "feat(6e): actionable WatchoutBanner fix buttons"
```

---

## Task 3: `ItineraryView` forwards `onFix`

**Files:**
- Modify: `src/components/itinerary/ItineraryView.tsx`
- Modify: `src/components/itinerary/ItineraryView.test.tsx`

- [ ] **Step 1: Add the optional prop + forward it**

Change the signature:

```tsx
export function ItineraryView({
  trip,
  onFix,
}: {
  trip: TripState
  onFix?: (prompt: string) => void
}) {
```

And the banner usage:

```tsx
        <WatchoutBanner watchouts={watchouts} onFix={onFix} />
```

- [ ] **Step 2: Add a test for forwarding**

Append to `src/components/itinerary/ItineraryView.test.tsx`:

```tsx
  it('forwards a fix click to onFix', () => {
    const onFix = vi.fn()
    const t = trip()
    t.stays[0].nights = 10 // triggers stay-nights-mismatch → a "Fix the dates" fix
    render(<ItineraryView trip={t} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: /fix the dates/i }))
    expect(onFix).toHaveBeenCalled()
  })
```

Add `vi` and `fireEvent` to the existing import line:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/components/itinerary/ItineraryView.test.tsx`
Expected: PASS (3 existing + 1 new).

- [ ] **Step 4: Commit**

```bash
git add src/components/itinerary/ItineraryView.tsx src/components/itinerary/ItineraryView.test.tsx
git commit -m "feat(6e): ItineraryView forwards onFix to the watch-out banner"
```

---

## Task 4: Wire `onFix` in the planner

**Files:**
- Modify: `src/components/PlannerScreen.tsx`

- [ ] **Step 1: Pass `onFix` to the itinerary**

In the right-pane render (6c/6d block), update the itinerary usage so a fix sends a chat message:

```tsx
              {view === 'plan' ? (
                <ItineraryView trip={trip} onFix={(prompt) => sendMessage({ text: prompt })} />
              ) : (
                <MapView markers={markers} />
              )}
```

(The shared `/trip/[id]` page keeps calling `<ItineraryView trip={trip} />` with no `onFix`, so its watch-outs stay read-only.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlannerScreen.tsx
git commit -m "feat(6e): watch-out fixes drive the chat in the planner"
```

---

## Task 5: System prompt — resolve flagged conflicts

**Files:**
- Modify: `src/lib/ai/systemPrompt.ts`
- Modify: `src/lib/ai/systemPrompt.test.ts`

- [ ] **Step 1: Add a guidance line**

In `buildSystemPrompt`, add this line right after the "cons as well as pros" line:

```ts
    '- Watch for and call out real conflicts (dates that do not line up, over-budget totals, tight connections), and offer a concrete fix.',
```

- [ ] **Step 2: Extend the test**

Add to `src/lib/ai/systemPrompt.test.ts` inside the existing `it`:

```ts
    expect(p.toLowerCase()).toContain('conflict')
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/lib/ai/systemPrompt.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/systemPrompt.ts src/lib/ai/systemPrompt.test.ts
git commit -m "feat(6e): prompt the assistant to flag and fix conflicts"
```

---

## Task 6: Full verification + visual review + finish

**Files:** none (verification only).

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npm test` → all pass.
Run: `npm run typecheck` → clean.
Run: `rm -rf .next && npm run build` → succeeds; route table unchanged.

- [ ] **Step 2: Visual review**

`npm run dev`. Build a trip that trips a rule — e.g. add one flight (→ "one-way" info) or set a low budget via the chat (→ "over-budget"). Confirm:
- The itinerary watch-out banner shows the issue with a **clickable fix button**.
- Clicking the fix **sends the fix prompt into the chat** and the assistant acts on it.
- The read-only shared `/trip/{id}` page shows the same watch-outs as **static chips** (no buttons).

- [ ] **Step 3: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** → on "merge locally", merge `feat/6e-watchouts-fix-flows` into `main`, delete the branch, update the project memory file to mark 6e complete.

---

## Self-Review

- **Spec coverage:** Implements spec §2.7 / §4.4 fix-flow half — watch-outs surfaced in the itinerary with actionable fixes that drive the chat, plus a new over-budget rule and a prompt nudge. Date-conflict rules remain deferred (documented, data-gated). ✓
- **Placeholder scan:** Full code for the rule, the banner rewrite, and exact edits for ItineraryView / PlannerScreen / systemPrompt. No TBDs. ✓
- **Type consistency:** `Watchout` / `WatchoutFix` unchanged; `onFix?: (prompt: string) => void` shares the same signature through `WatchoutBanner` → `ItineraryView` → `PlannerScreen`, funnelling into the existing `sendMessage` path (same as 6d menus/forms). ✓
- **Read-only safety:** `onFix` is optional; the server-rendered shared page omits it, so its banner degrades to static chips — no client handler leaks into a read-only surface. ✓
- **Test reality:** Rule gets a pure red→green test; banner/itinerary get behavior tests (button fires `onFix`; absent `onFix` → no buttons). ✓
