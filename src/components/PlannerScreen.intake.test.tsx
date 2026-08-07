import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { TriperUIMessage } from '@/lib/ui/messages'

/**
 * The brief closing on the client, not only in the model.
 *
 * The step the plan is on is a function of the trip — so an answer that only reaches the trip through
 * the model's `setTripMeta` leaves the step where it was whenever the model forgets to call it, and
 * the same card arrives again on the next turn. Being asked twice for what you just answered is the
 * moment an app stops feeling like it is listening.
 *
 * These drive the guided cards the way a traveler does and assert the plan panel has heard.
 */

const sendMessage = vi.fn()
let messages: TriperUIMessage[] = []

vi.mock('ai', () => ({
  DefaultChatTransport: class {
    constructor(_options: Record<string, unknown>) {}
  },
}))
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages, sendMessage, setMessages: vi.fn(), status: 'ready' }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('./plan/MapView', () => ({ MapView: () => null }))

import { PlannerScreen } from './PlannerScreen'

/** A thread whose last turn is one of our own guided cards. */
function asking(part: TriperUIMessage['parts'][number]): TriperUIMessage[] {
  return [
    { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Plan me a trip' }] },
    { id: 'm2', role: 'assistant', parts: [part] },
  ] as TriperUIMessage[]
}

describe('PlannerScreen — answering the brief', () => {
  beforeEach(() => {
    sendMessage.mockClear()
    messages = []
  })

  it('records a destination the moment the card is answered', () => {
    messages = asking({ type: 'data-detail', data: { field: 'destination', question: 'Where to?' } })
    render(<PlannerScreen />)

    fireEvent.change(screen.getByLabelText(/a city, a country/i), {
      target: { value: 'Barcelona' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send this answer/i }))

    // The plan's own heading is the visible proof the trip heard it.
    fireEvent.click(screen.getByTestId('plan-button'))
    expect(screen.getByTestId('plan-title')).toHaveTextContent('Barcelona')
    // And the concierge still gets the message, so the transcript reads properly.
    expect(sendMessage).toHaveBeenCalledWith({ text: 'Barcelona' })
  })

  it('records who is going from the steppers', () => {
    messages = asking({ type: 'data-detail', data: { field: 'party', question: 'Who is coming?' } })
    render(<PlannerScreen />)

    fireEvent.click(screen.getByRole('button', { name: /more adults/i }))
    fireEvent.click(screen.getByRole('button', { name: /2 adults/i }))

    expect(sendMessage).toHaveBeenCalledWith({ text: '2 adults · 1 room' })
  })

  it('leaves a typed answer to the concierge rather than guessing at it', () => {
    messages = asking({ type: 'data-detail', data: { field: 'party', question: 'Who is coming?' } })
    render(<PlannerScreen />)

    fireEvent.change(screen.getByLabelText(/your own words/i), {
      target: { value: 'me and the kids' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send this answer/i }))

    expect(sendMessage).toHaveBeenCalledWith({ text: 'me and the kids' })
  })
})
