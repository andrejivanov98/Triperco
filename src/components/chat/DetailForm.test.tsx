import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DetailForm } from './DetailForm'

/** Fixed so the calendar always opens on the same month. */
const TODAY = new Date('2026-09-01T00:00:00Z')

describe('DetailForm — dates', () => {
  const request = { field: 'dates' as const, question: 'When are you thinking of going?' }

  it('asks with a calendar rather than a sentence to compose', () => {
    render(<DetailForm request={request} onSubmit={() => {}} onSkip={() => {}} today={TODAY} />)
    expect(screen.getByText('When are you thinking of going?')).toBeInTheDocument()
    expect(screen.getByLabelText('2026-09-10')).toBeInTheDocument()
  })

  it('cannot be submitted until a date is chosen', () => {
    render(<DetailForm request={request} onSubmit={() => {}} onSkip={() => {}} today={TODAY} />)
    expect(screen.getByRole('button', { name: /pick dates/i })).toBeDisabled()
  })

  it('sends a chosen range as the traveler’s own message', () => {
    const onSubmit = vi.fn()
    render(<DetailForm request={request} onSubmit={onSubmit} onSkip={() => {}} today={TODAY} />)
    fireEvent.click(screen.getByLabelText('2026-09-10'))
    fireEvent.click(screen.getByLabelText('2026-09-15'))
    fireEvent.click(screen.getByRole('button', { name: /Sep 10 – 15/i }))
    expect(onSubmit).toHaveBeenCalledWith('2026-09-10 to 2026-09-15')
  })

  it('sends a single date when only one is picked', () => {
    const onSubmit = vi.fn()
    render(<DetailForm request={request} onSubmit={onSubmit} onSkip={() => {}} today={TODAY} />)
    fireEvent.click(screen.getByLabelText('2026-09-10'))
    fireEvent.click(screen.getByRole('button', { name: /Sep 10/i }))
    expect(onSubmit).toHaveBeenCalledWith('Leaving 2026-09-10')
  })

  it('still lets someone answer in words when they have not decided', () => {
    const onSubmit = vi.fn()
    render(<DetailForm request={request} onSubmit={onSubmit} onSkip={() => {}} today={TODAY} />)
    const field = screen.getByLabelText(/describe it/i)
    fireEvent.change(field, { target: { value: 'a week in May' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('a week in May')
  })

  it('never offers a date in the past', () => {
    render(<DetailForm request={request} onSubmit={() => {}} onSkip={() => {}} today={TODAY} />)
    expect(screen.getByLabelText('2026-09-01')).not.toBeDisabled()
    // The calendar opens on today's month, so earlier days in it must be unselectable.
    const past = new Date('2026-09-20T00:00:00Z')
    render(<DetailForm request={request} onSubmit={() => {}} onSkip={() => {}} today={past} />)
    expect(screen.getAllByLabelText('2026-09-10')[1]).toBeDisabled()
  })
})

describe('DetailForm — party', () => {
  const request = { field: 'party' as const, question: 'Who is coming?' }

  it('offers steppers and submits the described party', () => {
    const onSubmit = vi.fn()
    render(<DetailForm request={request} onSubmit={onSubmit} onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /more adults/i }))
    fireEvent.click(screen.getByRole('button', { name: /2 adults/i }))
    expect(onSubmit).toHaveBeenCalledWith('2 adults · 1 room')
  })

  it('can be submitted straight away, since one adult is a real answer', () => {
    render(<DetailForm request={request} onSubmit={() => {}} onSkip={() => {}} />)
    expect(screen.getByRole('button', { name: /1 adult · 1 room/i })).not.toBeDisabled()
  })
})

describe('DetailForm — budget', () => {
  const request = { field: 'budget' as const, question: 'What sort of budget?' }

  it('offers bands for someone who has no figure in mind', () => {
    const onSubmit = vi.fn()
    render(<DetailForm request={request} onSubmit={onSubmit} onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mid-range is fine' }))
    expect(onSubmit).toHaveBeenCalledWith('Mid-range is fine')
  })

  it('lets them decline to name one at all', () => {
    render(<DetailForm request={request} onSubmit={() => {}} onSkip={() => {}} />)
    expect(screen.getByRole('button', { name: 'No fixed budget' })).toBeInTheDocument()
  })
})

describe('DetailForm — origin', () => {
  it('asks for a city to type, since no control beats typing one', () => {
    const onSubmit = vi.fn()
    render(
      <DetailForm
        request={{ field: 'origin', question: 'Where are you flying from?' }}
        onSubmit={onSubmit}
        onSkip={() => {}}
      />,
    )
    const field = screen.getByLabelText(/city or airport/i)
    fireEvent.change(field, { target: { value: 'Skopje' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('Skopje')
  })
})
