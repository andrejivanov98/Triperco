# Triperco Planner UI 4a — Chat + Plan View + Trip Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the planner visible and interactive: a two-zone `/plan` screen with the guided chat on the left (`useChat` → `/api/chat`) and a live, Sky-Glass itinerary on the right that updates as the agent builds the trip.

**Architecture:** `PlannerScreen` (client) owns `useChat` and a `TripState`. Each send posts the current trip via `prepareSendMessagesRequest`; the route (updated here) streams assistant text **and** writes the finished `TripState` as a `data-trip` part; the client reads the latest `data-trip` and re-renders `PlanView`. Presentational components (`ChatPane`, `FlightCard`, `StayCard`, `DayCard`, `PlanView`) are prop-driven and unit-tested with React Testing Library; the `useChat`/streaming wiring in `PlannerScreen` and the route are verified by typecheck/build + the smoke test.

**Tech Stack:** `@ai-sdk/react` (`useChat`), `ai` v7 (`DefaultChatTransport`, `createUIMessageStream`), React 19, Tailwind (Sky Glass tokens from Plan 1), Vitest + React Testing Library (jsdom).

**Scope (Plan 4a):** jsdom test setup, `TriperUIMessage` type + trip-sync helper, `/api/chat` trip emission, formatting helper, itinerary cards, `PlanView`, `ChatPane`, `PlannerScreen` at `/plan`. **Out of scope:** the MapLibre map + Plan/Map toggle (**Plan 4b**), the landing page (Plan 5), accounts, real KV. The right pane in 4a shows the **Plan** only (the toggle arrives in 4b).

> **Verified against installed AI SDK v7:** `useChat({ transport: new DefaultChatTransport({ api, prepareSendMessagesRequest }) })`, `sendMessage({ text })`, message `.parts`, custom data parts via `createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'data-trip', data }); writer.merge(toUIMessageStream({ stream: result.stream })) } })`, and `agent.stream({ messages, onFinish })`.

---

## File Structure

```
vitest.setup.ts               # RTL + jest-dom matchers + cleanup
vitest.config.ts              # (modified) jsdom for *.test.tsx, include tsx, setupFiles
src/lib/ui/
  messages.ts                 # TriperUIMessage type + getLatestTrip(messages)
  messages.test.ts
  format.ts                   # formatMoney(amount)
  format.test.ts
src/components/plan/
  FlightCard.tsx  + .test.tsx
  StayCard.tsx    + .test.tsx
  DayCard.tsx     + .test.tsx
  PlanView.tsx    + .test.tsx
src/components/chat/
  ChatPane.tsx    + .test.tsx
src/components/
  PlannerScreen.tsx           # 'use client' — useChat + trip sync (build-verified)
src/app/plan/
  page.tsx                    # renders <PlannerScreen/>
src/app/api/chat/route.ts     # (modified) emit data-trip part
```

---

## Task 1: Install client + test dependencies

- [ ] **Step 1: Install**

Run: `npm install @ai-sdk/react` then `npm install -D @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom`
Expected: installs with no errors.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: add @ai-sdk/react + React Testing Library deps"
```

---

## Task 2: Configure Vitest for React (jsdom) component tests

**Files:**
- Create: `vitest.setup.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 2: Replace `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  // Use the automatic JSX runtime so components don't need `import React`.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    // Component tests (*.test.tsx) run in jsdom; pure logic tests stay in node.
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 3: Verify existing tests still pass under the new config**

Run: `npm test`
Expected: PASS — all Plan 1/2/3 suites still green (they run in node as before).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: configure Vitest jsdom for component tests"
```

---

## Task 3: UI message type + trip-sync helper

**Files:**
- Create: `src/lib/ui/messages.ts`
- Test: `src/lib/ui/messages.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/messages.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getLatestTrip } from './messages'
import type { TriperUIMessage } from './messages'
import { createTrip, setMeta } from '../trip/tripState'

describe('getLatestTrip', () => {
  it('returns the trip from the most recent data-trip part', () => {
    const older = setMeta(createTrip('t1'), { destination: 'Paris' })
    const newer = setMeta(createTrip('t1'), { destination: 'Rome' })
    const messages: TriperUIMessage[] = [
      { id: 'a', role: 'assistant', parts: [{ type: 'data-trip', data: older }] },
      { id: 'b', role: 'user', parts: [{ type: 'text', text: 'change to Rome' }] },
      { id: 'c', role: 'assistant', parts: [{ type: 'text', text: 'Done.' }, { type: 'data-trip', data: newer }] },
    ]
    expect(getLatestTrip(messages)?.meta.destination).toBe('Rome')
  })

  it('returns null when there is no trip part', () => {
    const messages: TriperUIMessage[] = [
      { id: 'a', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ]
    expect(getLatestTrip(messages)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/ui/messages.test.ts`
Expected: FAIL — cannot find module `./messages`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ui/messages.ts`:

```ts
import type { UIMessage } from 'ai'
import type { TripState } from '../trip/types'

/** Our chat message type: standard parts + a custom `data-trip` part carrying TripState. */
export type TriperUIMessage = UIMessage<never, { trip: TripState }>

/** Scan messages newest-first and return the most recent TripState, or null. */
export function getLatestTrip(messages: TriperUIMessage[]): TripState | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const parts = messages[i].parts
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j]
      if (part.type === 'data-trip') return part.data
    }
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/ui/messages.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add TriperUIMessage type and getLatestTrip helper"
```

---

## Task 4: Money formatting helper

**Files:**
- Create: `src/lib/ui/format.ts`
- Test: `src/lib/ui/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatMoney } from './format'

describe('formatMoney', () => {
  it('formats whole USD amounts with no decimals', () => {
    expect(formatMoney(1140)).toBe('$1,140')
  })

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('$0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/ui/format.test.ts`
Expected: FAIL — cannot find module `./format`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ui/format.ts`:

```ts
export function formatMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/ui/format.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add formatMoney helper"
```

---

## Task 5: Emit the updated trip from /api/chat

**Files:**
- Modify: `src/app/api/chat/route.ts`

No unit test (SDK/HTTP glue; the trip-building tools are already tested, and `getLatestTrip` is tested). Verified by typecheck + build here and the smoke test in Task 10.

- [ ] **Step 1: Replace `src/app/api/chat/route.ts`**

```ts
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai'
import { createPlannerAgent } from '@/lib/ai/plannerAgent'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { TripState } from '@/lib/trip/types'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, trip }: { messages: TriperUIMessage[]; trip?: TripState } =
    await req.json()

  const { agent, state } = createPlannerAgent({ trip })

  const stream = createUIMessageStream<TriperUIMessage>({
    execute: async ({ writer }) => {
      const result = await agent.stream({
        messages: await convertToModelMessages(messages),
        onFinish: () => {
          // Emit the trip the tools built this turn so the client can render it.
          writer.write({ type: 'data-trip', data: state.trip })
        },
      })
      writer.merge(toUIMessageStream({ stream: result.stream }))
    },
  })

  return createUIMessageStreamResponse({ stream })
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed; `/api/chat` still listed. If the installed v7 types disagree on `writer.write` data-part typing or `onFinish`, grep `node_modules/ai/docs/04-ai-sdk-ui/20-streaming-data.mdx` and `node_modules/ai/dist/index.d.ts` and adjust to match.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: stream updated TripState as data-trip part"
```

---

## Task 6: FlightCard + StayCard

**Files:**
- Create: `src/components/plan/FlightCard.tsx`, `src/components/plan/StayCard.tsx`
- Test: `src/components/plan/FlightCard.test.tsx`, `src/components/plan/StayCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/plan/FlightCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlightCard } from './FlightCard'
import type { Flight } from '@/lib/trip/types'

const flight: Flight = {
  id: 'f1', from: 'SKP', to: 'FCO', airline: 'Wizz Air',
  departTime: '10:00', arriveTime: '12:10', stops: 0, price: 180, bookUrl: 'https://air/book',
}

describe('FlightCard', () => {
  it('shows route, airline, price, and a booking link', () => {
    render(<FlightCard flight={flight} />)
    expect(screen.getByText(/SKP/)).toBeInTheDocument()
    expect(screen.getByText(/FCO/)).toBeInTheDocument()
    expect(screen.getByText(/Wizz Air/)).toBeInTheDocument()
    expect(screen.getByText(/\$180/)).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://air/book')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
```

Create `src/components/plan/StayCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StayCard } from './StayCard'
import type { Stay } from '@/lib/trip/types'

const stay: Stay = {
  id: 's1', name: 'Hotel Trastevere', source: 'hotel',
  rating: 4.6, reviewCount: 1204, pricePerNight: 110, nights: 3,
  photos: [], bookUrl: 'https://book/hotel',
}

describe('StayCard', () => {
  it('shows name, rating, nightly price and a booking link', () => {
    render(<StayCard stay={stay} />)
    expect(screen.getByText(/Hotel Trastevere/)).toBeInTheDocument()
    expect(screen.getByText(/4\.6/)).toBeInTheDocument()
    expect(screen.getByText(/\$110/)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://book/hotel')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test src/components/plan/FlightCard.test.tsx src/components/plan/StayCard.test.tsx`
Expected: FAIL — cannot find the modules.

- [ ] **Step 3: Write the components**

Create `src/components/plan/FlightCard.tsx`:

```tsx
import type { Flight } from '@/lib/trip/types'
import { formatMoney } from '@/lib/ui/format'

export function FlightCard({ flight }: { flight: Flight }) {
  const stopsLabel =
    flight.stops === 0 ? 'nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`
  const times = flight.departTime
    ? `${flight.departTime}${flight.arriveTime ? `–${flight.arriveTime}` : ''}`
    : undefined
  const meta = [flight.airline, times].filter(Boolean).join(' · ')

  return (
    <div className="glass flex items-center gap-3 p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-sky-600">Flight</div>
        <div className="truncate text-sm font-semibold text-slate-900">
          {flight.from} → {flight.to} · {stopsLabel}
        </div>
        {meta && <div className="truncate text-xs font-medium text-slate-500">{meta}</div>}
      </div>
      <a
        href={flight.bookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto shrink-0 text-sm font-bold text-sky-600"
      >
        {formatMoney(flight.price)} ↗
      </a>
    </div>
  )
}
```

Create `src/components/plan/StayCard.tsx`:

```tsx
import type { Stay } from '@/lib/trip/types'
import { formatMoney } from '@/lib/ui/format'

export function StayCard({ stay }: { stay: Stay }) {
  const meta = [
    stay.rating !== undefined ? `${stay.rating} ★` : null,
    stay.reviewCount !== undefined ? `${stay.reviewCount.toLocaleString()} reviews` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="glass flex items-center gap-3 p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-sky-600">Stay</div>
        <div className="truncate text-sm font-semibold text-slate-900">{stay.name}</div>
        {meta && <div className="truncate text-xs font-medium text-slate-500">{meta}</div>}
      </div>
      <a
        href={stay.bookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto shrink-0 text-right text-sm font-bold text-sky-600"
      >
        {formatMoney(stay.pricePerNight)}
        <span className="block text-[10px] font-medium text-slate-400">/night ↗</span>
      </a>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/components/plan/FlightCard.test.tsx src/components/plan/StayCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add FlightCard and StayCard"
```

---

## Task 7: DayCard + PlanView

**Files:**
- Create: `src/components/plan/DayCard.tsx`, `src/components/plan/PlanView.tsx`
- Test: `src/components/plan/DayCard.test.tsx`, `src/components/plan/PlanView.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/plan/DayCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DayCard } from './DayCard'
import type { Day } from '@/lib/trip/types'

const day: Day = {
  items: [
    { placeId: 'p1', name: 'Colosseum' },
    { placeId: 'p2', name: 'Trastevere dinner' },
  ],
}

describe('DayCard', () => {
  it('labels the day (1-based) and lists items', () => {
    render(<DayCard day={day} index={0} />)
    expect(screen.getByText(/Day 1/)).toBeInTheDocument()
    expect(screen.getByText(/Colosseum/)).toBeInTheDocument()
    expect(screen.getByText(/Trastevere dinner/)).toBeInTheDocument()
  })
})
```

Create `src/components/plan/PlanView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanView } from './PlanView'
import { createTrip, setMeta, addFlight } from '@/lib/trip/tripState'

describe('PlanView', () => {
  it('shows an empty hint and $0 total for a fresh trip', () => {
    render(<PlanView trip={createTrip('t1')} />)
    expect(screen.getByText(/plan will appear/i)).toBeInTheDocument()
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  it('renders destination, a flight, and the running total', () => {
    let trip = setMeta(createTrip('t1'), { destination: 'Rome' })
    trip = addFlight(trip, { id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 180, bookUrl: 'https://a' })
    render(<PlanView trip={trip} />)
    expect(screen.getByText('Rome')).toBeInTheDocument()
    expect(screen.getByText(/SKP/)).toBeInTheDocument()
    expect(screen.getByText('$180')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test src/components/plan/DayCard.test.tsx src/components/plan/PlanView.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the components**

Create `src/components/plan/DayCard.tsx`:

```tsx
import type { Day } from '@/lib/trip/types'

export function DayCard({ day, index }: { day: Day; index: number }) {
  return (
    <div className="glass p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-sky-600">
        Day {index + 1}
        {day.date ? ` · ${day.date}` : ''}
      </div>
      <ul className="mt-1 space-y-0.5">
        {day.items.map((item) => (
          <li key={item.placeId} className="text-sm font-medium text-slate-800">
            {item.name}
            {item.note ? <span className="text-slate-400"> — {item.note}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Create `src/components/plan/PlanView.tsx`:

```tsx
import type { TripState } from '@/lib/trip/types'
import { formatMoney } from '@/lib/ui/format'
import { FlightCard } from './FlightCard'
import { StayCard } from './StayCard'
import { DayCard } from './DayCard'

export function PlanView({ trip }: { trip: TripState }) {
  const isEmpty =
    trip.flights.length === 0 && trip.stays.length === 0 && trip.days.length === 0

  return (
    <div className="flex h-full flex-col gap-2">
      {trip.meta.destination && (
        <h2 className="px-1 text-lg font-bold tracking-tight text-slate-900">
          {trip.meta.destination}
        </h2>
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
          <p className="mt-6 text-center text-sm font-medium text-slate-400">
            Your plan will appear here as we build it together.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-100/60 px-4 py-3 text-sm font-bold text-sky-800">
        <span>Estimated total</span>
        <span>{formatMoney(trip.estimatedTotal)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/components/plan/DayCard.test.tsx src/components/plan/PlanView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add DayCard and PlanView"
```

---

## Task 8: ChatPane (presentational)

**Files:**
- Create: `src/components/chat/ChatPane.tsx`
- Test: `src/components/chat/ChatPane.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/chat/ChatPane.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatPane } from './ChatPane'
import type { TriperUIMessage } from '@/lib/ui/messages'

const messages: TriperUIMessage[] = [
  { id: 'a', role: 'user', parts: [{ type: 'text', text: 'Rome for 4 days' }] },
  { id: 'b', role: 'assistant', parts: [{ type: 'text', text: 'Great choice!' }] },
]

describe('ChatPane', () => {
  it('renders message text and suggestion chips', () => {
    render(
      <ChatPane messages={messages} status="ready" suggestions={['More food']} onSend={() => {}} />,
    )
    expect(screen.getByText('Rome for 4 days')).toBeInTheDocument()
    expect(screen.getByText('Great choice!')).toBeInTheDocument()
    expect(screen.getByText('More food')).toBeInTheDocument()
  })

  it('calls onSend when a chip is clicked', () => {
    const onSend = vi.fn()
    render(<ChatPane messages={[]} status="ready" suggestions={['Hidden gems']} onSend={onSend} />)
    fireEvent.click(screen.getByText('Hidden gems'))
    expect(onSend).toHaveBeenCalledWith('Hidden gems')
  })

  it('calls onSend with the typed text on submit', () => {
    const onSend = vi.fn()
    render(<ChatPane messages={[]} status="ready" suggestions={[]} onSend={onSend} />)
    fireEvent.change(screen.getByPlaceholderText(/ask anything/i), { target: { value: 'Plan Rome' } })
    fireEvent.submit(screen.getByRole('form'))
    expect(onSend).toHaveBeenCalledWith('Plan Rome')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/chat/ChatPane.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/components/chat/ChatPane.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { TriperUIMessage } from '@/lib/ui/messages'

interface ChatPaneProps {
  messages: TriperUIMessage[]
  status: string
  suggestions: string[]
  onSend: (text: string) => void
}

function messageText(message: TriperUIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function ChatPane({ messages, status, suggestions, onSend }: ChatPaneProps) {
  const [input, setInput] = useState('')
  const busy = status !== 'ready'

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  return (
    <div className="glass flex h-full flex-col p-4">
      <div className="mb-3 text-sm font-bold tracking-tight text-sky-600">✦ Triperco</div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'ml-6 rounded-2xl border border-sky-200 bg-sky-100/70 px-3 py-2 text-sm font-medium text-sky-900'
                : 'rounded-2xl border border-white/60 bg-white/50 px-3 py-2 text-sm font-medium text-slate-800'
            }
          >
            {messageText(m)}
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              disabled={busy}
              className="rounded-full border border-sky-200 bg-sky-100/70 px-3 py-1.5 text-xs font-semibold text-sky-700 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        role="form"
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your trip…"
          className="flex-1 rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/30 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/chat/ChatPane.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add presentational ChatPane"
```

---

## Task 9: PlannerScreen + /plan route

**Files:**
- Create: `src/components/PlannerScreen.tsx`
- Create: `src/app/plan/page.tsx`

No unit test (owns `useChat` + live streaming; verified by typecheck/build + smoke test). Its children are all tested.

- [ ] **Step 1: Write `src/components/PlannerScreen.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { TripState } from '@/lib/trip/types'
import type { TriperUIMessage } from '@/lib/ui/messages'
import { getLatestTrip } from '@/lib/ui/messages'
import { createTrip } from '@/lib/trip/tripState'
import { ChatPane } from './chat/ChatPane'
import { PlanView } from './plan/PlanView'

const SUGGESTIONS = ['Plan a weekend in Rome', 'Find me a cheap flight', 'Add a hidden gem']

export function PlannerScreen() {
  const [trip, setTrip] = useState<TripState>(() => createTrip('draft'))
  const tripRef = useRef(trip)
  tripRef.current = trip

  const { messages, sendMessage, status } = useChat<TriperUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      // Send the current trip up with every turn so the agent continues from it.
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, trip: tripRef.current },
      }),
    }),
  })

  // Pull the latest server-built trip into the right pane.
  useEffect(() => {
    const latest = getLatestTrip(messages)
    if (latest) setTrip(latest)
  }, [messages])

  return (
    <main className="mx-auto grid h-screen max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(320px,36%)_1fr]">
      <ChatPane
        messages={messages}
        status={status}
        suggestions={messages.length === 0 ? SUGGESTIONS : []}
        onSend={(text) => sendMessage({ text })}
      />
      <div className="glass min-h-0 p-4">
        <PlanView trip={trip} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Write `src/app/plan/page.tsx`**

```tsx
import { PlannerScreen } from '@/components/PlannerScreen'

export default function PlanPage() {
  return <PlannerScreen />
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed; `/plan` appears in the route list. If `useChat`'s generic or `status` typing differs in the installed `@ai-sdk/react`, grep `node_modules/@ai-sdk/react` and adjust (e.g. the exact `status` union or the transport option name).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add PlannerScreen and /plan route"
```

---

## Task 10: Final verification

**Files:** none.

- [ ] **Step 1: Typecheck** — Run: `npm run typecheck` — Expected: no errors.
- [ ] **Step 2: Full test suite** — Run: `npm test` — Expected: PASS (Plan 1/2/3 + new UI suites).
- [ ] **Step 3: Build** — Run: `npm run build` — Expected: succeeds; `/plan` listed.
- [ ] **Step 4: Clean tree** — Run: `git status` — Expected: nothing to commit.
- [ ] **Step 5 (optional, needs real keys + running dev server): live check.** With `.env.local` set, `npm run dev`, open `http://localhost:3000/plan`, and send "Plan 3 days in Rome, find a flight from Skopje and a hotel." Expected: assistant text streams on the left; flight/stay/day cards and the running total appear on the right as the agent builds the trip. (Manual confidence check, not a gate.)

---

## Definition of done

- `npm run typecheck`, `npm test`, `npm run build` all pass.
- `/plan` renders the two-zone Sky-Glass screen: guided chat left, live itinerary right.
- Presentational components (cards, PlanView, ChatPane) and the trip-sync helper are unit-tested; the trip round-trips client → `/api/chat` → client via the `data-trip` part.
- Every task committed.

**Next:** Plan 4b — MapLibre map view + Plan⇄Map toggle in the right pane; then Plan 5 — landing page + shareable/cloneable trips (Vercel KV).
