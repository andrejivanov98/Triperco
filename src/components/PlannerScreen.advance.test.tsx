import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import type { ResultSet } from '@/lib/ui/results'
import type { Flight, Stay, TripMeta } from '@/lib/trip/types'

/**
 * Adding a card is a decision the agent never used to hear about: the plan snapshot is built when a
 * message is *sent*, so choosing a flight and then waiting told it nothing at all. That is why
 * "flights are in — shall we find you a bed?" could not happen, however the prompt was worded.
 *
 * These drive the screen through real card presses and assert the conversation picks itself up.
 */

const sendMessage = vi.fn()
let messages: unknown[] = []
let status = 'ready'

vi.mock('ai', () => ({
  DefaultChatTransport: class {
    constructor(_options: Record<string, unknown>) {}
  },
}))
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages, sendMessage, setMessages: vi.fn(), status }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
// The map pulls in maplibre, which jsdom cannot run and none of this needs.
vi.mock('./plan/MapView', () => ({ MapView: () => null }))

import { PlannerScreen } from './PlannerScreen'

const outbound: Flight = { id: 'f1', from: 'SKP', to: 'TFS', stops: 0, price: 180, bookUrl: '' }
const homeward: Flight = {
  id: 'f2',
  from: 'TFS',
  to: 'SKP',
  stops: 0,
  price: 160,
  bookUrl: '',
  direction: 'return',
}
const hotel: Stay = {
  id: 's1',
  name: 'Hotel X',
  source: 'hotel',
  pricePerNight: 100,
  nights: 9,
  photos: [],
  bookUrl: '',
}

/** What the agent recorded from "Skopje - Tenerife, 19-28 March, 2 adults". */
const meta: TripMeta = {
  destination: 'Tenerife',
  origin: 'SKP',
  startDate: '2027-03-19',
  endDate: '2027-03-28',
  travelers: 2,
  adults: 2,
}

function flightSet(items: Flight[]): ResultSet {
  return { kind: 'flights', query: 'SKP → TFS', items, flightType: 'one_way' }
}

const stayResults: ResultSet = { kind: 'stays', query: 'Tenerife', items: [hotel] }

/** A thread that has already started, carrying the context the agent recorded. */
function started() {
  return [
    { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Skopje - Tenerife' }] },
    {
      id: 'm2',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Nine nights, two of you.' },
        { type: 'data-meta', data: meta },
      ],
    },
  ]
}

function showing(...sets: ResultSet[]) {
  return [
    ...started(),
    ...sets.map((data, i) => ({
      id: `r${i}`,
      role: 'assistant',
      parts: [{ type: 'data-results', data }],
    })),
  ]
}

function addControls(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll('button')].filter((b) =>
    /add to trip|select flight|select both/i.test(b.textContent ?? ''),
  )
}

/** Press every add control the screen is showing. Cards word it differently per kind. */
function addAll(container: HTMLElement) {
  const buttons = addControls(container)
  expect(buttons.length).toBeGreaterThan(0)
  act(() => {
    for (const button of buttons) button.click()
  })
}

/**
 * A stay is added from its detail panel rather than its card — the card is one object you tap, so
 * the press has to go through the panel the way a traveler's does.
 */
function addStay(container: HTMLElement) {
  const card = container.querySelector<HTMLElement>('[aria-label$="see details"]')
  expect(card).not.toBeNull()
  act(() => {
    card!.click()
  })
  const add = addControls(document.body).at(-1)
  expect(add).toBeDefined()
  act(() => {
    add!.click()
  })
}

describe('PlannerScreen — picking the conversation back up when the plan moves on', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sendMessage.mockClear()
    messages = []
    status = 'ready'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('says nothing at all while the conversation has not started', () => {
    render(<PlannerScreen />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('asks about a bed once both flight legs are in the plan', () => {
    messages = showing(flightSet([outbound, homeward]))
    const { container } = render(<PlannerScreen />)
    addAll(container)

    // Not yet: an add is one moment, and the return leg is usually a second press away.
    expect(sendMessage).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage.mock.calls[0][0].text).toMatch(/stay/i)
  })

  it('stays quiet while only the way out is chosen', () => {
    messages = showing(flightSet([outbound]))
    const { container } = render(<PlannerScreen />)
    addAll(container)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    // Half a journey: the step has not changed, so there is nothing new to say.
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('asks what is worth doing once a stay lands', () => {
    messages = showing(flightSet([outbound, homeward]), stayResults)
    const { container } = render(<PlannerScreen />)
    addAll(container)
    addStay(container)
    act(() => {
      vi.advanceTimersByTime(1500)
    })

    // One interruption, at the step the plan actually reached — not one per thing added.
    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage.mock.calls[0][0].text).toMatch(/worth doing/i)
  })

  it('never interrupts a turn that is still running', () => {
    status = 'streaming'
    messages = showing(flightSet([outbound, homeward]))
    const { container } = render(<PlannerScreen />)
    addAll(container)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('speaks once per step, however many times the plan is touched', () => {
    messages = showing(flightSet([outbound, homeward]))
    const { container } = render(<PlannerScreen />)
    addAll(container)
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(sendMessage).toHaveBeenCalledTimes(1)

    // Adding is idempotent on the trip, and must not become a second interruption.
    const again = [...container.querySelectorAll('button')].filter((b) =>
      /add to trip|select flight|select both/i.test(b.textContent ?? ''),
    )
    act(() => {
      for (const button of again) button.click()
      vi.advanceTimersByTime(5000)
    })
    expect(sendMessage).toHaveBeenCalledTimes(1)
  })
})
