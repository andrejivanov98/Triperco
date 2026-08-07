import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Flight } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'

/**
 * The conversation's table of contents has to be reachable on a phone.
 *
 * It only ever lived in the header, which hands its middle slot to `md` and up — so on the screen
 * where the scroll is longest and going back by hand is hardest, there was no way back at all.
 */

const flights: ResultSet = {
  kind: 'flights',
  query: 'SKP → FCO',
  flightType: 'one_way',
  items: [{ id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 120, bookUrl: 'x' } as Flight],
}
const stays: ResultSet = { kind: 'stays', query: 'Rome', items: [] }

const messages = [
  { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Rome in March' }] },
  { id: 'm2', role: 'assistant', parts: [{ type: 'data-results', data: flights }] },
  { id: 'm3', role: 'assistant', parts: [{ type: 'data-results', data: stays }] },
]

vi.mock('ai', () => ({
  DefaultChatTransport: class {
    constructor(_options: Record<string, unknown>) {}
  },
}))
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages, sendMessage: vi.fn(), setMessages: vi.fn(), status: 'ready' }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('./plan/MapView', () => ({ MapView: () => null }))

import { PlannerScreen } from './PlannerScreen'

describe('jumping around the conversation', () => {
  it('offers the navigator on a phone as well as in the header', () => {
    render(<PlannerScreen />)
    // Two of them: the header pill for wide screens, its own row for narrow ones.
    expect(screen.getAllByTestId('section-navigator')).toHaveLength(2)
    expect(screen.getByTestId('mobile-section-nav').className).toContain('md:hidden')
  })

  it('lists every search in the phone dropdown', () => {
    render(<PlannerScreen />)
    const mobile = screen.getByTestId('mobile-section-nav')
    fireEvent.click(mobile.querySelector('[data-testid="section-navigator"]')!)

    const options = [...mobile.querySelectorAll('[role="option"]')].map((o) => o.textContent)
    expect(options.some((label) => /flights/i.test(label ?? ''))).toBe(true)
    expect(options.some((label) => /stays in rome/i.test(label ?? ''))).toBe(true)
  })

  it('scrolls to the part that was chosen', () => {
    render(<PlannerScreen />)
    const target = document.getElementById('m2:0')
    expect(target).not.toBeNull()
    const scrollIntoView = vi.fn()
    target!.scrollIntoView = scrollIntoView

    const mobile = screen.getByTestId('mobile-section-nav')
    fireEvent.click(mobile.querySelector('[data-testid="section-navigator"]')!)
    fireEvent.click([...mobile.querySelectorAll('[role="option"]')][0])

    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('keeps the row out of the way until there is something to jump to', () => {
    // Nothing searched yet is nothing to navigate, so the row does not take up a line.
    messages.length = 0
    render(<PlannerScreen />)
    expect(screen.queryByTestId('mobile-section-nav')).not.toBeInTheDocument()
    messages.push(
      { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Rome in March' }] },
      { id: 'm2', role: 'assistant', parts: [{ type: 'data-results', data: flights }] },
      { id: 'm3', role: 'assistant', parts: [{ type: 'data-results', data: stays }] },
    )
  })
})
