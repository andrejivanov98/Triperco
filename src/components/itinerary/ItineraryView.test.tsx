import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ItineraryView } from './ItineraryView'
import { createTrip } from '@/lib/trip/tripState'
import type { TripState } from '@/lib/trip/types'

function trip(): TripState {
  return {
    ...createTrip('t1'),
    meta: { travelers: 2, destination: 'Tenerife', title: 'Tenerife Escape', startDate: '2026-09-01', endDate: '2026-09-15' },
    stays: [{ id: 's1', name: 'Apt', source: 'airbnb', pricePerNight: 100, nights: 14, photos: [], bookUrl: 'x' }],
    estimatedTotal: 1462,
  }
}

describe('ItineraryView', () => {
  it('renders the trip title, total, and a flights add-slot', () => {
    render(<ItineraryView trip={trip()} />)
    expect(screen.getByRole('heading', { name: 'Tenerife Escape' })).toBeInTheDocument()
    expect(screen.getByText('$1,462')).toBeInTheDocument() // trip total (distinct from the $1,400 stay)
    expect(screen.getByText(/no flights yet/i)).toBeInTheDocument()
  })

  it('breaks the total down by flights and stays', () => {
    const t = trip()
    t.flights = [{ id: 'f1', from: 'SKP', to: 'TFS', stops: 0, price: 200, bookUrl: 'x' }]
    render(<ItineraryView trip={t} />)
    // 200 per traveler × 2 travelers
    expect(screen.getByText(/Flights × 2/)).toBeInTheDocument()
    expect(screen.getByText('$400')).toBeInTheDocument()
    expect(screen.getByText('Stays')).toBeInTheDocument()
  })

  it('renders a repeated id without breaking the list', () => {
    const t = trip()
    // A shared trip saved before adds were deduped can still carry a repeat.
    t.days = [
      {
        items: [
          { placeId: 'dup', name: 'Colosseum' },
          { placeId: 'dup', name: 'Colosseum' },
        ],
      },
    ]
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args))
    render(<ItineraryView trip={t} />)
    spy.mockRestore()
    expect(screen.getAllByText('Colosseum')).toHaveLength(2)
    expect(JSON.stringify(errors)).not.toMatch(/same key/i)
  })

  it('shows the empty state when nothing is added', () => {
    render(<ItineraryView trip={createTrip('empty')} />)
    expect(screen.getByText(/your plan builds here/i)).toBeInTheDocument()
  })

  it('lets the traveler correct the trip context when editing is wired up', () => {
    const onEditMeta = vi.fn()
    render(<ItineraryView trip={trip()} onEditMeta={onEditMeta} />)
    fireEvent.click(screen.getByRole('button', { name: /add traveler/i }))
    expect(onEditMeta).toHaveBeenCalledWith({ travelers: 3 })
  })

  it('hides the context editor when no handler is given', () => {
    render(<ItineraryView trip={trip()} />)
    expect(screen.queryByRole('button', { name: /add traveler/i })).not.toBeInTheDocument()
  })

  it('surfaces a watch-out (stay nights vs trip length)', () => {
    const t = trip()
    t.stays[0].nights = 10
    render(<ItineraryView trip={t} />)
    expect(screen.getByText(/covers 10 nights/i)).toBeInTheDocument()
  })

  it('forwards a fix click to onFix', () => {
    const onFix = vi.fn()
    const t = trip()
    t.stays[0].nights = 10 // triggers stay-nights-mismatch → a "Fix the dates" fix
    render(<ItineraryView trip={t} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: /fix the dates/i }))
    expect(onFix).toHaveBeenCalled()
  })
})
