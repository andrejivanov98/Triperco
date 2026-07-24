import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingComposer } from './LandingComposer'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

describe('LandingComposer', () => {
  it('navigates to /plan with the composed query params', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.change(screen.getByPlaceholderText(/where to/i), { target: { value: 'Tenerife' } })
    fireEvent.click(screen.getByRole('button', { name: /add traveler/i }))
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledTimes(1)
    const url = push.mock.calls[0][0] as string
    expect(url).toContain('/plan?')
    expect(url).toContain('dest=Tenerife')
    expect(url).toContain('travelers=2')
  })

  it('still routes to /plan when nothing is entered', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledWith('/plan')
  })
})
