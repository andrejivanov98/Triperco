# Plan 6d — Guided Chat Interactions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the chat guide the traveler Odessia-style: a **start / next-steps menu** the assistant can present, **preference micro-forms** (multi- and single-select), a persistent **editable context bar** (destination · dates · travelers), and a system prompt that narrates/curates and names the trip.

**Architecture:** Two new UIMessage data parts — `data-options` (a choice menu) and `data-form` (a preference form) — emitted the same way as `data-results`: new agent tools (`presentOptions`, `askPreferences`) push to `PlannerState`, and the route streams them in `onFinish`. The client renders them in the chat; **choosing an option or submitting a form just calls the existing `onSend`** (the option's `prompt` / the joined selections), so no new chat plumbing is needed. The **context bar** edits `trip.meta` client-side via the existing `setMeta` reducer (instant, round-trips like 6c's adds).

**Tech Stack:** AI SDK v7 data parts + tools, Next.js 15, TypeScript strict, Tailwind v4 (Sky Glass 2.0), Vitest + RTL.

**Scope note (deviation from spec §7):** The **chapter/thread switcher** is deferred — it needs a multi-conversation model that doesn't exist yet and is lower value than the guidance primitives. 6d ships the start menu, preference forms, context bar, and narration.

---

## File Structure

- **Create:** `src/lib/ui/interactions.ts` (+ test) — `OptionSet` / `PrefForm` types + `getOptionSets` / `getForms`.
- **Modify:** `src/lib/ui/messages.ts` — extend the data map with `options` + `form`.
- **Modify:** `src/lib/ai/tools.ts` — `pendingOptions` / `pendingForms`; `presentOptions` + `askPreferences` tools; `title` on `setTripMeta`.
- **Modify:** `src/app/api/chat/route.ts` — emit `data-options` / `data-form`.
- **Modify:** `src/lib/ai/systemPrompt.ts` (+ test) — guidance for the new tools + narration + trip title.
- **Create:** `src/components/chat/OptionList.tsx` (+ test) — the guided menu.
- **Create:** `src/components/chat/PrefForm.tsx` (+ test) — multi/single preference form.
- **Create:** `src/components/chat/ContextChips.tsx` (+ test) — editable destination/dates/travelers bar.
- **Modify:** `src/components/chat/ChatPane.tsx` — render `data-options` / `data-form` parts (reusing `onSend`).
- **Modify:** `src/components/PlannerScreen.tsx` — render `ContextChips` above chat; wire `onEditMeta` → client `setMeta`.

---

## Task 1: Interaction types + message extension

**Files:**
- Create: `src/lib/ui/interactions.ts`
- Create: `src/lib/ui/interactions.test.ts`
- Modify: `src/lib/ui/messages.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/ui/interactions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getOptionSets, getForms } from './interactions'
import type { TriperUIMessage } from './messages'

describe('interaction helpers', () => {
  it('extracts option sets and forms from a message', () => {
    const msg: TriperUIMessage = {
      id: 'm', role: 'assistant',
      parts: [
        { type: 'text', text: 'How shall we start?' },
        { type: 'data-options', data: { question: 'Start with', options: [{ label: 'Find a hotel', prompt: 'Find me a hotel' }] } },
        { type: 'data-form', data: { question: 'Interests?', mode: 'multi', options: ['Beaches', 'Hikes'] } },
      ],
    }
    expect(getOptionSets(msg)[0].options[0].label).toBe('Find a hotel')
    expect(getForms(msg)[0].mode).toBe('multi')
  })

  it('returns [] when absent', () => {
    const msg: TriperUIMessage = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] }
    expect(getOptionSets(msg)).toEqual([])
    expect(getForms(msg)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/ui/interactions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `interactions.ts`**

```ts
import type { TriperUIMessage } from './messages'

export interface OptionChoice {
  label: string
  prompt: string
}

/** A guided menu the assistant presents; choosing sends the choice's `prompt`. */
export interface OptionSet {
  question?: string
  options: OptionChoice[]
}

/** A preference micro-form; submitting sends the selection(s) as a message. */
export interface PrefForm {
  question: string
  mode: 'single' | 'multi'
  options: string[]
}

export function getOptionSets(message: TriperUIMessage): OptionSet[] {
  return message.parts
    .filter((p): p is { type: 'data-options'; data: OptionSet } => p.type === 'data-options')
    .map((p) => p.data)
}

export function getForms(message: TriperUIMessage): PrefForm[] {
  return message.parts
    .filter((p): p is { type: 'data-form'; data: PrefForm } => p.type === 'data-form')
    .map((p) => p.data)
}
```

- [ ] **Step 4: Extend `messages.ts`**

```ts
import type { UIMessage } from 'ai'
import type { TripState } from '../trip/types'
import type { ResultSet } from './results'
import type { OptionSet, PrefForm } from './interactions'

/** Standard parts + custom data parts (trip sync, search results, guided menus, forms). */
export type TriperUIMessage = UIMessage<
  never,
  { trip: TripState; results: ResultSet; options: OptionSet; form: PrefForm }
>
```

(Leave `getLatestTrip` unchanged.)

- [ ] **Step 5: Run the test + typecheck**

Run: `npx vitest run src/lib/ui/interactions.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ui/interactions.ts src/lib/ui/interactions.test.ts src/lib/ui/messages.ts
git commit -m "feat(6d): OptionSet/PrefForm data parts + helpers"
```

---

## Task 2: Tools — presentOptions, askPreferences, trip title

**Files:**
- Modify: `src/lib/ai/tools.ts`
- Modify: `src/lib/ai/tools.test.ts`

- [ ] **Step 1: Add pending queues + type imports**

Add the import:

```ts
import type { OptionSet, PrefForm } from '../ui/interactions'
```

Extend `PlannerState` + initializer with:

```ts
  pendingOptions: OptionSet[]
  pendingForms: PrefForm[]
```

```ts
    pendingOptions: [],
    pendingForms: [],
```

- [ ] **Step 2: Add `title` to `setTripMeta`**

In the `setTripMeta` inputSchema object, add:

```ts
        title: z.string().optional().describe('Short evocative trip name, e.g. "Tenerife Escape"'),
```

(`setMeta` already spreads the patch and `TripMeta.title` exists, so no reducer change.)

- [ ] **Step 3: Add the two presentation tools (inside the returned object)**

```ts
    presentOptions: tool({
      description:
        'Show the traveler a short menu of next steps to choose from (e.g. Find a hotel / Look up flights / Build the full trip). After calling this, STOP and wait for their choice.',
      inputSchema: z.object({
        question: z.string().optional(),
        options: z
          .array(z.object({ label: z.string(), prompt: z.string() }))
          .min(1)
          .describe('Each option: a short label and the prompt to send when chosen.'),
      }),
      execute: async ({ question, options }) => {
        state.pendingOptions.push({ question, options })
        return { presented: options.length }
      },
    }),

    askPreferences: tool({
      description:
        "Ask a preference question with preset options — mode 'multi' for interests (pick several), 'single' for a single choice like pace. After calling this, STOP and wait.",
      inputSchema: z.object({
        question: z.string(),
        mode: z.enum(['single', 'multi']),
        options: z.array(z.string()).min(2),
      }),
      execute: async ({ question, mode, options }) => {
        state.pendingForms.push({ question, mode, options })
        return { presented: options.length }
      },
    }),
```

- [ ] **Step 4: Test the new tools**

Append to `src/lib/ai/tools.test.ts`:

```ts
describe('guided interaction tools', () => {
  it('presentOptions queues an option set', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    const res = await run(tools.presentOptions, {
      question: 'Start with',
      options: [{ label: 'Find a hotel', prompt: 'Find me a hotel' }],
    })
    expect(res.presented).toBe(1)
    expect(state.pendingOptions[0].options[0].label).toBe('Find a hotel')
  })

  it('askPreferences queues a form', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    await run(tools.askPreferences, { question: 'Interests?', mode: 'multi', options: ['Beaches', 'Hikes'] })
    expect(state.pendingForms[0]).toMatchObject({ mode: 'multi' })
  })

  it('setTripMeta accepts a title', async () => {
    const state = createPlannerState()
    const tools = buildPlannerTools(state)
    await run(tools.setTripMeta, { title: 'Tenerife Escape' })
    expect(state.trip.meta.title).toBe('Tenerife Escape')
  })
})
```

- [ ] **Step 5: Run the tools tests + typecheck**

Run: `npx vitest run src/lib/ai/tools.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/tools.ts src/lib/ai/tools.test.ts
git commit -m "feat(6d): presentOptions + askPreferences tools; trip title on setTripMeta"
```

---

## Task 3: Route emits the new parts

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Emit options + forms in `onFinish`**

After the `pendingResults` loop, add:

```ts
          for (const o of state.pendingOptions) {
            writer.write({ type: 'data-options', data: o })
          }
          for (const f of state.pendingForms) {
            writer.write({ type: 'data-form', data: f })
          }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(6d): stream data-options and data-form parts"
```

---

## Task 4: System prompt guidance

**Files:**
- Modify: `src/lib/ai/systemPrompt.ts`
- Modify: `src/lib/ai/systemPrompt.test.ts`

- [ ] **Step 1: Update the prompt**

Replace the body of `buildSystemPrompt` with:

```ts
export function buildSystemPrompt(): string {
  return [
    'You are Triperco, a warm, expert travel concierge who plans complete trips in one conversation.',
    '',
    'How you work:',
    '- Guide the traveler step by step. Prefer concrete choices over open questions:',
    '  • Call presentOptions to offer next steps (e.g. Find a hotel / Look up flights / Build the full trip), then stop and wait.',
    '  • Call askPreferences for subjective input — mode "multi" for interests, "single" for things like pace — then stop and wait.',
    '- Give the trip a short evocative title early via setTripMeta (e.g. "Tenerife Escape").',
    '- Before a search, say one short sentence about what you are doing ("I\'ll find well-located stays") — the result cards render right below your message.',
    '- Use the tools to search real flights, hotels, and places, and to build the trip.',
    '- NEVER invent prices, names, ratings, availability, or links. Only use data returned by the tools.',
    '- Add flights, stays, and places to the trip ONLY via the add* tools, using ids from the most recent search results.',
    '- When recommending, be honest: mention cons as well as pros, and surface hidden gems the traveler might miss.',
    '- Prices are "as of search" — remind the traveler to confirm the final price on the provider site.',
    '',
    'Style: concise and friendly. The itinerary panel shows the full details, so keep chat replies short and focused on the next decision.',
  ].join('\n')
}
```

- [ ] **Step 2: Extend the test**

Add assertions to `src/lib/ai/systemPrompt.test.ts` inside the existing `it`:

```ts
    expect(p).toContain('presentOptions')
    expect(p).toContain('askPreferences')
    expect(p.toLowerCase()).toContain('title')
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/lib/ai/systemPrompt.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/systemPrompt.ts src/lib/ai/systemPrompt.test.ts
git commit -m "feat(6d): system prompt guidance for menus, forms, narration, title"
```

---

## Task 5: `OptionList`

**Files:**
- Create: `src/components/chat/OptionList.tsx`
- Create: `src/components/chat/OptionList.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/chat/OptionList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OptionList } from './OptionList'
import type { OptionSet } from '@/lib/ui/interactions'

const set: OptionSet = {
  question: 'What would you like to start with?',
  options: [
    { label: 'Find a hotel', prompt: 'Find me a hotel' },
    { label: 'Look up flights', prompt: 'Look up flights' },
  ],
}

describe('OptionList', () => {
  it('renders the question and options', () => {
    render(<OptionList set={set} onChoose={() => {}} />)
    expect(screen.getByText('What would you like to start with?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find a hotel' })).toBeInTheDocument()
  })

  it('sends the chosen option prompt', () => {
    const onChoose = vi.fn()
    render(<OptionList set={set} onChoose={onChoose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Look up flights' }))
    expect(onChoose).toHaveBeenCalledWith('Look up flights')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/chat/OptionList.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `OptionList.tsx`**

```tsx
import type { OptionSet } from '@/lib/ui/interactions'

export function OptionList({ set, onChoose }: { set: OptionSet; onChoose: (prompt: string) => void }) {
  return (
    <div className="glass overflow-hidden p-0">
      {set.question && (
        <div className="px-4 pt-3 pb-1 text-sm font-semibold text-ink">{set.question}</div>
      )}
      <div className="flex flex-col">
        {set.options.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onChoose(o.prompt)}
            className="border-t border-hairline px-4 py-3 text-left text-sm font-medium text-ink first:border-t-0 hover:bg-accent-050"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/chat/OptionList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/OptionList.tsx src/components/chat/OptionList.test.tsx
git commit -m "feat(6d): OptionList guided menu"
```

---

## Task 6: `PrefForm`

**Files:**
- Create: `src/components/chat/PrefForm.tsx`
- Create: `src/components/chat/PrefForm.test.tsx`

Single-select submits on tap; multi-select accumulates checkboxes and submits via **Next**. Both send a text summary; **Skip** sends a skip message.

- [ ] **Step 1: Write the failing test**

`src/components/chat/PrefForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PrefForm } from './PrefForm'
import type { PrefForm as PrefFormData } from '@/lib/ui/interactions'

const multi: PrefFormData = { question: 'What do you enjoy?', mode: 'multi', options: ['Beaches', 'Hikes', 'Food'] }
const single: PrefFormData = { question: 'What pace?', mode: 'single', options: ['Relaxed', 'Packed'] }

describe('PrefForm', () => {
  it('multi: checks options and submits the joined selection via Next', () => {
    const onSubmit = vi.fn()
    render(<PrefForm form={multi} onSubmit={onSubmit} onSkip={() => {}} />)
    fireEvent.click(screen.getByLabelText('Beaches'))
    fireEvent.click(screen.getByLabelText('Food'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSubmit).toHaveBeenCalledWith('Beaches, Food')
  })

  it('single: submits immediately on choice', () => {
    const onSubmit = vi.fn()
    render(<PrefForm form={single} onSubmit={onSubmit} onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Relaxed' }))
    expect(onSubmit).toHaveBeenCalledWith('Relaxed')
  })

  it('fires onSkip', () => {
    const onSkip = vi.fn()
    render(<PrefForm form={single} onSubmit={() => {}} onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/chat/PrefForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PrefForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { PrefForm as PrefFormData } from '@/lib/ui/interactions'

export function PrefForm({
  form,
  onSubmit,
  onSkip,
}: {
  form: PrefFormData
  onSubmit: (text: string) => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(opt: string) {
    setSelected((cur) => (cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]))
  }

  return (
    <div className="glass flex flex-col gap-2 p-4">
      <div className="text-sm font-semibold text-ink">{form.question}</div>

      {form.mode === 'single' ? (
        <div className="flex flex-col">
          {form.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onSubmit(o)}
              className="border-t border-hairline py-2.5 text-left text-sm font-medium text-ink first:border-t-0 hover:bg-accent-050"
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {form.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
                className="h-4 w-4 accent-sky-500"
              />
              {o}
            </label>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <button type="button" onClick={onSkip} className="text-xs font-semibold text-muted">
          Skip
        </button>
        {form.mode === 'multi' && (
          <button
            type="button"
            onClick={() => onSubmit(selected.join(', '))}
            disabled={selected.length === 0}
            className="rounded-xl bg-deep px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/chat/PrefForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/PrefForm.tsx src/components/chat/PrefForm.test.tsx
git commit -m "feat(6d): PrefForm preference micro-form"
```

---

## Task 7: `ContextChips`

**Files:**
- Create: `src/components/chat/ContextChips.tsx`
- Create: `src/components/chat/ContextChips.test.tsx`

A compact editable bar bound to `trip.meta`, applying edits via an `onEdit(patch)` callback (wired to the `setMeta` reducer in Task 9). Destination is an inline text input; dates are native date inputs; travelers is a −/＋ stepper.

- [ ] **Step 1: Write the failing test**

`src/components/chat/ContextChips.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContextChips } from './ContextChips'
import type { TripMeta } from '@/lib/trip/types'

const meta: TripMeta = { destination: 'Tenerife', startDate: '2026-09-01', endDate: '2026-09-15', travelers: 2 }

describe('ContextChips', () => {
  it('shows destination and travelers', () => {
    render(<ContextChips meta={meta} onEdit={() => {}} />)
    expect(screen.getByDisplayValue('Tenerife')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('increments travelers via the stepper', () => {
    const onEdit = vi.fn()
    render(<ContextChips meta={meta} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /add traveler/i }))
    expect(onEdit).toHaveBeenCalledWith({ travelers: 3 })
  })

  it('never lets travelers drop below 1', () => {
    const onEdit = vi.fn()
    render(<ContextChips meta={{ travelers: 1 }} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /remove traveler/i }))
    expect(onEdit).toHaveBeenCalledWith({ travelers: 1 })
  })

  it('edits the destination on change', () => {
    const onEdit = vi.fn()
    render(<ContextChips meta={meta} onEdit={onEdit} />)
    fireEvent.change(screen.getByPlaceholderText(/where to/i), { target: { value: 'Rome' } })
    expect(onEdit).toHaveBeenCalledWith({ destination: 'Rome' })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/chat/ContextChips.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ContextChips.tsx`**

```tsx
'use client'

import type { TripMeta } from '@/lib/trip/types'

export function ContextChips({
  meta,
  onEdit,
}: {
  meta: TripMeta
  onEdit: (patch: Partial<TripMeta>) => void
}) {
  const travelers = meta.travelers > 0 ? meta.travelers : 1
  const chip = 'rounded-full border border-hairline bg-white/60 px-2.5 py-1 text-xs font-medium text-ink'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={meta.destination ?? ''}
        onChange={(e) => onEdit({ destination: e.target.value })}
        placeholder="Where to?"
        className={`${chip} w-28 outline-none placeholder:text-muted`}
      />
      <input
        type="date"
        value={meta.startDate ?? ''}
        onChange={(e) => onEdit({ startDate: e.target.value })}
        aria-label="Start date"
        className={chip}
      />
      <input
        type="date"
        value={meta.endDate ?? ''}
        onChange={(e) => onEdit({ endDate: e.target.value })}
        aria-label="End date"
        className={chip}
      />
      <div className={`${chip} inline-flex items-center gap-2`}>
        <button type="button" aria-label="Remove traveler" onClick={() => onEdit({ travelers: Math.max(1, travelers - 1) })}>
          −
        </button>
        <span aria-label="travelers">{travelers}</span>
        <button type="button" aria-label="Add traveler" onClick={() => onEdit({ travelers: travelers + 1 })}>
          +
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/chat/ContextChips.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ContextChips.tsx src/components/chat/ContextChips.test.tsx
git commit -m "feat(6d): editable ContextChips bar"
```

---

## Task 8: ChatPane renders menus + forms

**Files:**
- Modify: `src/components/chat/ChatPane.tsx`
- Modify: `src/components/chat/ChatPane.test.tsx`

Reuses `onSend` — an option's `prompt`, a form's joined selection, or a skip message all go back through the same send path.

- [ ] **Step 1: Add imports**

```tsx
import { getOptionSets, getForms } from '@/lib/ui/interactions'
import { OptionList } from './OptionList'
import { PrefForm } from './PrefForm'
```

- [ ] **Step 2: Render option/form parts alongside carousels**

Inside the message map, after the `sets.map(...)` carousel block, add option lists and forms for assistant messages:

```tsx
              {(m.role === 'assistant' ? getOptionSets(m) : []).map((set, i) => (
                <OptionList key={`o${i}`} set={set} onChoose={onSend} />
              ))}
              {(m.role === 'assistant' ? getForms(m) : []).map((form, i) => (
                <PrefForm
                  key={`f${i}`}
                  form={form}
                  onSubmit={onSend}
                  onSkip={() => onSend("Let's skip that.")}
                />
              ))}
```

(No new props — `onSend` is already passed. Existing behaviour and tests are unaffected.)

- [ ] **Step 3: Add a rendering test**

Append to `src/components/chat/ChatPane.test.tsx`:

```tsx
  it('renders a guided option menu and sends the chosen prompt', () => {
    const onSend = vi.fn()
    const msgs: TriperUIMessage[] = [
      {
        id: 'o', role: 'assistant',
        parts: [
          { type: 'text', text: 'How shall we start?' },
          { type: 'data-options', data: { question: 'Start with', options: [{ label: 'Find a hotel', prompt: 'Find me a hotel' }] } },
        ],
      },
    ]
    render(<ChatPane messages={msgs} status="ready" suggestions={[]} onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: 'Find a hotel' }))
    expect(onSend).toHaveBeenCalledWith('Find me a hotel')
  })
```

- [ ] **Step 4: Run the chat tests**

Run: `npx vitest run src/components/chat`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatPane.tsx src/components/chat/ChatPane.test.tsx
git commit -m "feat(6d): render guided menus + preference forms in ChatPane"
```

---

## Task 9: Wire ContextChips into the planner

**Files:**
- Modify: `src/components/PlannerScreen.tsx`

- [ ] **Step 1: Import `setMeta` and `ContextChips`**

Add `setMeta` to the `tripState` import and:

```tsx
import { ContextChips } from './chat/ContextChips'
```

- [ ] **Step 2: Add an edit handler**

Near `addResult`:

```tsx
  const editMeta = useCallback((patch: Partial<TripState['meta']>) => {
    setTrip((t) => setMeta(t, patch))
  }, [])
```

- [ ] **Step 3: Wrap the left column with the context bar**

Replace the `<ChatPane .../>` element (the first grid child) with a flex column that stacks the context bar above the chat:

```tsx
      <div className="flex min-h-0 flex-col gap-3">
        <ContextChips meta={trip.meta} onEdit={editMeta} />
        <div className="min-h-0 flex-1">
          <ChatPane
            messages={messages}
            status={status}
            suggestions={messages.length === 0 ? SUGGESTIONS : []}
            onSend={(text) => sendMessage({ text })}
            onAddResult={addResult}
            onOpenDetail={openDetail}
          />
        </div>
      </div>
```

(The right-pane block from 6c is unchanged.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlannerScreen.tsx
git commit -m "feat(6d): context bar above chat, editing meta client-side"
```

---

## Task 10: Full verification + visual review + finish

**Files:** none (verification only).

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npm test` → all pass.
Run: `npm run typecheck` → clean.
Run: `rm -rf .next && npm run build` → succeeds; route table unchanged.

- [ ] **Step 2: Visual review**

`npm run dev`, then at `http://localhost:3000/plan?q=Plan%20a%20week%20in%20Tenerife` confirm (real keys needed for live agent):
- A **context bar** (destination · dates · travelers) sits above the chat; editing travelers/dates/destination updates the itinerary hero + totals instantly.
- The assistant offers a **start menu** (tappable rows); choosing one sends it and continues.
- A **preference form** (multi-select interests, then single-select pace) appears; Next/Skip work.
- The assistant names the trip (hero shows e.g. "Tenerife Escape").
- Result carousels + detail views (6c) still work.

- [ ] **Step 3: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** → on "merge locally", merge `feat/6d-guided-interactions` into `main`, delete the branch, update the project memory file to mark 6d complete.

---

## Self-Review

- **Spec coverage:** Implements spec §5 (`data-options`, `data-form`) and §2.2/§2.5/§6 (start menu, editable context chips, preference micro-forms, narration + title). Chapter switcher deferred (documented). ✓
- **Placeholder scan:** Full code for `interactions.ts`, tool/route/prompt edits, and all three components; exact edit blocks for ChatPane + PlannerScreen. No TBDs. ✓
- **Type consistency:** `OptionSet` / `OptionChoice` / `PrefForm` used identically across `interactions.ts`, tools, route, `OptionList`, `PrefForm`, `ChatPane`; `ContextChips` consumes `TripMeta` and emits `Partial<TripMeta>` to the existing `setMeta`. Menu/form/skip all funnel through the one `onSend` signature. ✓
- **Reducer reuse:** Context edits call the tested `setMeta` (with `withTotal`), consistent with 6c's client-mutation model and the server round-trip. ✓
- **Test reality:** Types/tools/components get real red→green tests; the route emission is type-checked + build-verified + visually confirmed (no unit seam), same as `data-results`. ✓
