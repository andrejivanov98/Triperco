import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// The planner is a client screen; stub its data sources so we can assert the layout contract.
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: [], sendMessage: vi.fn(), setMessages: vi.fn(), status: 'ready' }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { PlannerScreen } from './PlannerScreen'

describe('PlannerScreen layout', () => {
  it('splits the screen 70/30 in a ratio content cannot renegotiate', () => {
    render(<PlannerScreen />)
    const grid = screen.getByTestId('planner-grid')
    expect(grid.className).toContain('lg:grid-cols-[7fr_3fr]')
  })

  it('lets neither pane be widened by its content', () => {
    render(<PlannerScreen />)
    for (const id of ['chat-pane', 'plan-pane']) {
      const pane = screen.getByTestId(id)
      expect(pane.className).toContain('min-w-0')
      expect(pane.className).toContain('overflow-hidden')
    }
  })

  it('never scrolls the page sideways on a desktop viewport', () => {
    render(<PlannerScreen />)
    expect(screen.getByTestId('planner-grid').className).toContain('overflow-hidden')
  })
})
