import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TripContext } from './TripContext'
import type { TripMeta } from '@/lib/trip/types'

const meta: TripMeta = { destination: 'Tenerife', startDate: '2026-09-01', endDate: '2026-09-15', travelers: 2 }

describe('TripContext', () => {
  it('shows destination and travelers', () => {
    render(<TripContext meta={meta} onEdit={() => {}} />)
    expect(screen.getByDisplayValue('Tenerife')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('increments travelers via the stepper', () => {
    const onEdit = vi.fn()
    render(<TripContext meta={meta} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /add traveler/i }))
    expect(onEdit).toHaveBeenCalledWith({ travelers: 3 })
  })

  it('never lets travelers drop below 1', () => {
    const onEdit = vi.fn()
    render(<TripContext meta={{ travelers: 1 }} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /remove traveler/i }))
    expect(onEdit).toHaveBeenCalledWith({ travelers: 1 })
  })

  it('edits the destination on change', () => {
    const onEdit = vi.fn()
    render(<TripContext meta={meta} onEdit={onEdit} />)
    fireEvent.change(screen.getByPlaceholderText(/where to/i), { target: { value: 'Rome' } })
    expect(onEdit).toHaveBeenCalledWith({ destination: 'Rome' })
  })
})
