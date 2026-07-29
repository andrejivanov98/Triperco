import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingComposer } from './LandingComposer'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

function ask(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/ask triperco anything/i), { target: { value: text } })
}

describe('LandingComposer', () => {
  it('sends free text into the planner as the opening message', () => {
    push.mockClear()
    render(<LandingComposer />)
    ask('a week in Japan with great food')
    fireEvent.submit(screen.getByRole('form'))
    const url = push.mock.calls[0][0] as string
    expect(url).toContain('/plan?')
    expect(url).toContain('q=a+week+in+Japan+with+great+food')
  })

  it('still routes to /plan when nothing is entered', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledWith('/plan')
  })

  it('keeps the pickers closed until asked for', () => {
    render(<LandingComposer />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /who/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /when/i })).toBeInTheDocument()
  })

  it('collects rooms, adults and children and passes them on', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.click(screen.getByRole('button', { name: /who/i }))
    fireEvent.click(screen.getByRole('button', { name: /more adults/i }))
    fireEvent.click(screen.getByRole('button', { name: /more children/i }))
    fireEvent.click(screen.getByRole('button', { name: /more rooms/i }))
    fireEvent.submit(screen.getByRole('form'))

    const url = push.mock.calls[0][0] as string
    expect(url).toContain('adults=2')
    expect(url).toContain('children=1')
    expect(url).toContain('rooms=2')
  })

  it('summarises the party on the trigger once chosen', () => {
    render(<LandingComposer />)
    fireEvent.click(screen.getByRole('button', { name: /who/i }))
    fireEvent.click(screen.getByRole('button', { name: /more adults/i }))
    expect(screen.getByRole('button', { name: /2 adults · 1 room/i })).toBeInTheDocument()
  })

  it('omits guest params when the party is untouched', () => {
    push.mockClear()
    render(<LandingComposer />)
    ask('Rome')
    fireEvent.submit(screen.getByRole('form'))
    const url = push.mock.calls[0][0] as string
    expect(url).not.toContain('adults=')
    expect(url).not.toContain('rooms=')
  })

  it('picks a date range from the calendar and shows it on the trigger', () => {
    push.mockClear()
    render(<LandingComposer />)
    fireEvent.click(screen.getByRole('button', { name: /when/i }))

    // Pick two days far enough ahead that they're never in the past, paging forward until the
    // month holding them is on screen (the range can start in a later month than today's).
    const future = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10)
    const later = new Date(Date.now() + 44 * 86_400_000).toISOString().slice(0, 10)
    for (let page = 0; page < 4 && !screen.queryByRole('button', { name: future }); page++) {
      fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    }
    fireEvent.click(screen.getByRole('button', { name: future }))
    for (let page = 0; page < 4 && !screen.queryByRole('button', { name: later }); page++) {
      fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    }
    fireEvent.click(screen.getByRole('button', { name: later }))
    fireEvent.submit(screen.getByRole('form'))

    const url = push.mock.calls[0][0] as string
    expect(url).toContain(`start=${future}`)
    expect(url).toContain(`end=${later}`)
  })

  it('closes a picker on Escape', () => {
    render(<LandingComposer />)
    fireEvent.click(screen.getByRole('button', { name: /who/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
