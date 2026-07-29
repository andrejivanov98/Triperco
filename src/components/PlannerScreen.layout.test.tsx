import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// The planner is a client screen; stub its data sources so we can assert the layout contract.
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: [], sendMessage: vi.fn(), setMessages: vi.fn(), status: 'ready' }),
}))
const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { PlannerScreen } from './PlannerScreen'

/*
 * The fixed 70/30 split is deliberately gone. The conversation owns the width and the plan is a
 * drawer you summon, so the contract is now: the chat is never squeezed, and the plan is always one
 * tap away with its contents counted on the button.
 */
describe('PlannerScreen layout', () => {
  it('gives the whole width to the conversation', () => {
    render(<PlannerScreen />)
    const chat = screen.getByTestId('chat-pane')
    expect(chat.className).toContain('flex-1')
    expect(chat.className).toContain('min-w-0')
  })

  it('keeps the plan closed until it is asked for', () => {
    render(<PlannerScreen />)
    expect(screen.queryByTestId('plan-overlay')).not.toBeInTheDocument()
    expect(screen.getByTestId('plan-button')).toBeInTheDocument()
  })

  it('opens the plan on tap', () => {
    render(<PlannerScreen />)
    fireEvent.click(screen.getByTestId('plan-button'))
    expect(screen.getByTestId('plan-overlay')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /your plan/i })).toBeInTheDocument()
  })

  it('closes again from the button', () => {
    render(<PlannerScreen />)
    fireEvent.click(screen.getByTestId('plan-button'))
    fireEvent.click(screen.getByRole('button', { name: /close ✕/i }))
    expect(screen.queryByTestId('plan-overlay')).not.toBeInTheDocument()
  })

  it('closes on Escape, because it is a modal', () => {
    render(<PlannerScreen />)
    fireEvent.click(screen.getByTestId('plan-button'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('plan-overlay')).not.toBeInTheDocument()
  })

  it('makes the open plan addressable so the link can be shared', () => {
    render(<PlannerScreen />)
    replace.mockClear()
    fireEvent.click(screen.getByTestId('plan-button'))
    expect(replace).toHaveBeenCalledWith('/plan?plan=open')
  })

  it('drops the parameter again when it closes', () => {
    render(<PlannerScreen />)
    fireEvent.click(screen.getByTestId('plan-button'))
    replace.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /close ✕/i }))
    expect(replace).toHaveBeenCalledWith('/plan')
  })

  it('shows nothing on the plan button while the trip is empty', () => {
    render(<PlannerScreen />)
    expect(screen.queryByTestId('plan-count')).not.toBeInTheDocument()
  })

  it('never lets a wide card row scroll the page sideways', () => {
    render(<PlannerScreen />)
    expect(screen.getByTestId('chat-pane').className).toContain('overflow-hidden')
  })
})
