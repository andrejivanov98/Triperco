import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    expect(screen.getByText(/search flights/i)).toBeInTheDocument()
  })

  it('shows the empty state when nothing is added', () => {
    render(<ItineraryView trip={createTrip('empty')} />)
    expect(screen.getByText(/your trip will appear here/i)).toBeInTheDocument()
  })

  it('surfaces a watch-out (stay nights vs trip length)', () => {
    const t = trip()
    t.stays[0].nights = 10
    render(<ItineraryView trip={t} />)
    expect(screen.getByText(/covers 10 nights/i)).toBeInTheDocument()
  })
})
