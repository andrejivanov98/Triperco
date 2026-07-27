import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingComposer } from './LandingComposer'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

function openDetails() {
  fireEvent.click(screen.getByRole('button', { name: /dates|travelers/i }))
}

describe('LandingComposer', () => {
  it('sends free text straight into the planner as the opening message', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.change(screen.getByPlaceholderText(/describe your trip/i), {
      target: { value: 'a week in Japan with great food' },
    })
    fireEvent.submit(screen.getByRole('form'))
    const url = push.mock.calls[0][0] as string
    expect(url).toContain('/plan?')
    expect(url).toContain('q=a+week+in+Japan+with+great+food')
  })

  it('passes optional dates and travelers alongside the prompt', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.change(screen.getByPlaceholderText(/describe your trip/i), {
      target: { value: 'Rome' },
    })
    openDetails()
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-09-05' } })
    fireEvent.click(screen.getByRole('button', { name: /add traveler/i }))
    fireEvent.submit(screen.getByRole('form'))
    const url = push.mock.calls[0][0] as string
    expect(url).toContain('start=2026-09-01')
    expect(url).toContain('end=2026-09-05')
    expect(url).toContain('travelers=2')
  })

  it('keeps the date and traveler fields out of the way until asked for', () => {
    render(<LandingComposer />)
    expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument()
    openDetails()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
  })

  it('still routes to /plan when nothing is entered', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledWith('/plan')
  })
})
