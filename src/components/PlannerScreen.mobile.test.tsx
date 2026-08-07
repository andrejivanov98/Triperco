import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ResultSet } from '@/lib/ui/results'
import type { Flight } from '@/lib/trip/types'

/**
 * The reported mobile failure, and its actual cause.
 *
 * Opening the conversation's history navigator on a phone left the header and the plan button
 * scrolled away above it, so getting back to the plan meant scrolling up and hoping. The chrome was
 * never scrolling on its own — the *document* was. A `min-height: 100vh` page under a shell sized to
 * the visible viewport is taller than the screen by exactly the height of the browser's URL bar, so
 * any `scrollIntoView` inside the conversation took the whole page with it.
 *
 * With the document pinned there is nowhere for the chrome to go.
 */

const flights: ResultSet = {
  kind: 'flights',
  query: 'SKP → FCO',
  flightType: 'one_way',
  items: [{ id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 120, bookUrl: 'x' } as Flight],
}

const messages = [
  { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Rome in March' }] },
  { id: 'm2', role: 'assistant', parts: [{ type: 'data-results', data: flights }] },
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

afterEach(() => document.documentElement.classList.remove('app-shell'))

describe('the planner is an app shell, not a document', () => {
  it('pins the page while it is up, so the chrome cannot scroll away', () => {
    render(<PlannerScreen />)
    expect(document.documentElement.classList.contains('app-shell')).toBe(true)
  })

  /** The landing page and a shared trip are documents. Pages you read should scroll. */
  it('unpins it again on the way out', () => {
    const { unmount } = render(<PlannerScreen />)
    unmount()
    expect(document.documentElement.classList.contains('app-shell')).toBe(false)
  })

  it('keeps the plan button on screen beside the conversation', () => {
    render(<PlannerScreen />)
    expect(screen.getByTestId('plan-button')).toBeInTheDocument()
    // Sticky, and inside a shell that cannot scroll — so it stays put rather than being scrolled off.
    expect(screen.getByTestId('site-header').className).toContain('sticky')
  })

  it('leaves room for the phone’s home indicator under the composer', () => {
    render(<PlannerScreen />)
    const shell = screen.getByTestId('chat-pane').parentElement
    expect(shell?.className).toContain('safe-area-inset-bottom')
  })
})

/**
 * The navigator opens upward from the bottom on a phone: every option under the thumb, and fixed to
 * the viewport so no ancestor's overflow can clip it the way an absolute dropdown could.
 */
describe('the history navigator on a phone', () => {
  function openMobileNav() {
    render(<PlannerScreen />)
    const row = screen.getByTestId('mobile-section-nav')
    fireEvent.click(row.querySelector('[data-testid="section-navigator"]')!)
    return row
  }

  it('opens as a sheet anchored to the bottom of the screen', () => {
    const row = openMobileNav()
    const list = row.querySelector('[role="listbox"]')!
    expect(list.className).toContain('fixed')
    expect(list.className).toContain('bottom-0')
  })

  it('puts a backdrop behind it, so a tap anywhere closes it', () => {
    const row = openMobileNav()
    const backdrop = row.querySelector('button[aria-label="Dismiss"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)
    expect(row.querySelector('[role="listbox"]')).toBeNull()
  })

  it('still lists every search, and still jumps to one', () => {
    const row = openMobileNav()
    const options = [...row.querySelectorAll('[role="option"]')]
    expect(options.length).toBeGreaterThan(0)

    const target = document.getElementById('m2:0')!
    const scrollIntoView = vi.fn()
    target.scrollIntoView = scrollIntoView
    fireEvent.click(options[0])
    expect(scrollIntoView).toHaveBeenCalled()
  })

  /** The header pill keeps its dropdown: there is no thumb reaching for it on a desktop. */
  it('leaves the header’s own navigator as a dropdown', () => {
    render(<PlannerScreen />)
    const header = screen.getByTestId('site-header')
    fireEvent.click(header.querySelector('[data-testid="section-navigator"]')!)
    expect(header.querySelector('[role="listbox"]')!.className).toContain('absolute')
  })
})
