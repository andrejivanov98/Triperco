import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import type { Flight, Stay, TripMeta } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { FINISH_LABEL } from '@/lib/ui/finish'

/**
 * A planning chat had no last turn. Everything was covered, the concierge kept politely offering
 * another restaurant, and the traveler was left wondering whether they were finished or whether
 * something was still owed — with no way to say "that's enough" but closing the tab.
 *
 * These drive the screen to a covered plan and assert it says so, offers a way out, and answers with
 * the trip itself rather than with a model's prose.
 */

const sendMessage = vi.fn()
let messages: unknown[] = []
const setMessages = vi.fn((update: unknown) => {
  messages = typeof update === 'function' ? (update as (m: unknown[]) => unknown[])(messages) : (update as unknown[])
})

vi.mock('ai', () => ({
  DefaultChatTransport: class {
    constructor(_options: Record<string, unknown>) {}
  },
}))
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages, sendMessage, setMessages, status: 'ready' }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('./plan/MapView', () => ({ MapView: () => null }))

import { PlannerScreen } from './PlannerScreen'

const outbound: Flight = {
  id: 'f1', from: 'SKP', to: 'FCO', airline: 'Wizz Air', stops: 0, price: 120, bookUrl: 'x',
  departDate: '2027-03-19', departTime: '07:15', arriveTime: '09:05',
}
const homeward: Flight = { ...outbound, id: 'f2', from: 'FCO', to: 'SKP', direction: 'return', price: 140 }
const hotel: Stay = {
  id: 's1', name: 'Hotel Artemide', source: 'hotel', pricePerNight: 120, nights: 5,
  photos: [], bookUrl: 'x', address: 'Via Nazionale 22, Rome',
}

const meta: TripMeta = {
  destination: 'Rome',
  origin: 'SKP',
  startDate: '2027-03-19',
  endDate: '2027-03-24',
  travelers: 2,
  adults: 2,
  // Set by getTransferOptions itself once the journeys have been answered.
  transfersReviewed: true,
}

function set(data: ResultSet, id: string) {
  return { id, role: 'assistant', parts: [{ type: 'data-results', data }] }
}

/** A thread that has already surfaced everything a trip needs. */
function thread() {
  return [
    { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Rome in March' }] },
    {
      id: 'm2',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Five nights, two of you.' }, { type: 'data-meta', data: meta }],
    },
    set({ kind: 'flights', query: 'SKP → FCO', items: [outbound, homeward], flightType: 'one_way' }, 'r0'),
    set({ kind: 'stays', query: 'Rome', items: [hotel] }, 'r1'),
    set({ kind: 'places', query: 'top sights in Rome', placeKind: 'attraction', items: [
      { id: 'p1', name: 'Colosseum', photos: [], reviewSnippets: [], sourceLinks: {} },
    ] }, 'r2'),
  ]
}

function addControls(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter((b) =>
    /add to trip|select flight|select both/i.test(b.textContent ?? ''),
  )
}

/**
 * Build the plan the way a traveler does: flights straight off their cards, and stays and places
 * through the detail panel each of those cards opens.
 */
function buildTheWholeTrip(container: HTMLElement) {
  act(() => {
    for (const button of addControls(container)) button.click()
  })

  const cards = [...container.querySelectorAll<HTMLElement>('[aria-label$="see details"]')]
  for (const card of cards) {
    act(() => card.click())
    const add = addControls(document.body).at(-1)
    if (add) act(() => add.click())
    const close = [...document.body.querySelectorAll('button')].find((b) =>
      /close ✕/i.test(b.textContent ?? ''),
    )
    if (close) act(() => close.click())
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  sendMessage.mockClear()
  setMessages.mockClear()
  messages = thread()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/api/trips')) {
        return { ok: true, json: async () => ({ id: 'abc123', token: 't' }) } as Response
      }
      return { ok: true, json: async () => ({ photo: null, legs: {} }) } as Response
    }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('reaching the end of the planning', () => {
  it('says the trip is covered and offers what to do next', () => {
    const { container, rerender } = render(<PlannerScreen />)
    buildTheWholeTrip(container)
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    rerender(<PlannerScreen />)

    expect(screen.getByText(/that is your trip covered/i)).toBeInTheDocument()
    // Ways to keep going, and one way to stop.
    expect(screen.getByText(/make it cheaper/i)).toBeInTheDocument()
    expect(screen.getByText(FINISH_LABEL)).toBeInTheDocument()
  })

  /*
   * Said by the app, not asked of the concierge. A model told everything was done goes looking for
   * one more thing to offer, which is exactly how a finished plan never got announced.
   */
  it('does not spend a turn asking the concierge what is left', () => {
    const { container } = render(<PlannerScreen />)
    buildTheWholeTrip(container)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    const asked = sendMessage.mock.calls.map((c) => String(c[0]?.text))
    expect(asked.some((text) => /what'?s left to sort/i.test(text))).toBe(false)
  })

  it('announces it once, however many times the plan is touched afterwards', () => {
    const { container, rerender } = render(<PlannerScreen />)
    buildTheWholeTrip(container)
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    rerender(<PlannerScreen />)
    act(() => {
      for (const button of addControls(container)) button.click()
      vi.advanceTimersByTime(5000)
    })
    rerender(<PlannerScreen />)
    expect(screen.getAllByText(/that is your trip covered/i)).toHaveLength(1)
  })
})

describe('finishing', () => {
  async function finish(container: HTMLElement, rerender: (ui: React.ReactElement) => void) {
    buildTheWholeTrip(container)
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    rerender(<PlannerScreen />)
    fireEvent.click(screen.getByText(FINISH_LABEL))
    // The link is saved before the recap goes in, so let the save settle.
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    rerender(<PlannerScreen />)
  }

  it('answers with the trip step by step rather than sending it to the concierge', async () => {
    const { container, rerender } = render(<PlannerScreen />)
    await finish(container, rerender)

    const recap = screen.getByTestId('trip-recap')
    expect(recap).toBeInTheDocument()
    const steps = [...recap.querySelectorAll('li')].map((li) => li.textContent ?? '')
    expect(steps[0]).toContain('SKP → FCO')
    expect(steps.some((s) => /Hotel Artemide/.test(s))).toBe(true)
    expect(steps.some((s) => /Colosseum/.test(s))).toBe(true)
  })

  it('never asks the model to write the summary', async () => {
    const { container, rerender } = render(<PlannerScreen />)
    sendMessage.mockClear()
    await finish(container, rerender)
    const asked = sendMessage.mock.calls.map((c) => String(c[0]?.text))
    expect(asked.some((text) => /summarise my trip/i.test(text))).toBe(false)
  })

  it('hands over the link to the trip summary', async () => {
    const { container, rerender } = render(<PlannerScreen />)
    await finish(container, rerender)
    const link = screen.getByRole('link', { name: /open the trip summary/i })
    expect(link.getAttribute('href')).toContain('/trip/abc123')
  })

  /** A transcript with invisible turns in it is a transcript nobody can follow. */
  it('keeps the traveler’s own words in the transcript', async () => {
    const { container, rerender } = render(<PlannerScreen />)
    await finish(container, rerender)
    expect(screen.getByText(/summarise my trip/i)).toBeInTheDocument()
  })

  /** A trip that could not be saved still gets its summary — just through the panel instead. */
  it('offers the summary panel when there is no link to give', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({}) }) as Response),
    )
    const { container, rerender } = render(<PlannerScreen />)
    await finish(container, rerender)

    expect(screen.queryByRole('link', { name: /open the trip summary/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /open the trip summary/i }))
    expect(screen.getByRole('dialog', { name: /trip summary/i })).toBeInTheDocument()
  })
})
