import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BookingPanel } from './BookingPanel'
import { createTrip } from '@/lib/trip/tripState'
import type { TripState } from '@/lib/trip/types'

function trip(): TripState {
  return {
    ...createTrip('t1'),
    meta: { travelers: 2, destination: 'Ljubljana', title: 'Ljubljana Weekend Getaway', startDate: '2026-08-07', endDate: '2026-08-10' },
    flights: [
      { id: 'f1', from: 'SKP', to: 'LJU', airline: 'Wizz Air', price: 120, stops: 0, bookUrl: 'https://fly/1' },
    ],
    stays: [
      {
        id: 's1',
        name: 'City residence apartment',
        source: 'hotel',
        kind: 'vacation_rental',
        pricePerNight: 326,
        nights: 3,
        totalPrice: 979,
        photos: ['https://p/1'],
        bookUrl: 'https://airbnb.com/rooms/1',
        offers: [{ source: 'Airbnb', url: 'https://airbnb.com/rooms/1', official: true }],
      },
    ],
    days: [],
    estimatedTotal: 1219,
  }
}

describe('BookingPanel — booking links', () => {
  it('lists every bookable item with its provider link', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: /where to book each part/i })).toBeInTheDocument()
    expect(screen.getByText('City residence apartment')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /book on Airbnb/i })).toHaveAttribute(
      'href',
      'https://airbnb.com/rooms/1',
    )
    expect(screen.getByRole('link', { name: /book on Wizz Air/i })).toBeInTheDocument()
  })

  it('shows the trip total across everything bookable', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    // 120 × 2 travelers + 979
    expect(screen.getByText('$1,219')).toBeInTheDocument()
  })

  it('starts everything as not booked and counts progress', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    expect(screen.getByText(/0 of 2 booked/i)).toBeInTheDocument()
  })

  it('lets the traveler record that they booked something', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    const control = screen.getByLabelText(/booking status for City residence apartment/i)
    fireEvent.change(control, { target: { value: 'confirmed' } })
    expect(screen.getByText(/1 of 2 booked/i)).toBeInTheDocument()
  })

  it('says so when there is nothing to book', () => {
    render(<BookingPanel trip={createTrip('empty')} onClose={() => {}} />)
    expect(screen.getByText(/nothing to book yet/i)).toBeInTheDocument()
  })

  it('does not call the providers our partners', () => {
    const { container } = render(<BookingPanel trip={trip()} onClose={() => {}} />)
    expect(container.textContent?.toLowerCase()).not.toContain('our partners')
    expect(container.textContent?.toLowerCase()).toContain('not affiliated')
  })

  it('closes from the button', () => {
    const onClose = vi.fn()
    render(<BookingPanel trip={trip()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close ✕/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('BookingPanel — summary', () => {
  it('opens a trip summary with the trip name and dates', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /view trip summary/i }))
    expect(screen.getByRole('heading', { name: /Ljubljana Weekend Getaway/i })).toBeInTheDocument()
    expect(screen.getByText(/Aug 7 – 10 · 2 travelers/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print \/ save pdf/i })).toBeInTheDocument()
  })

  it('keeps recorded statuses when switching views', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText(/booking status for City residence apartment/i), {
      target: { value: 'booked' },
    })
    fireEvent.click(screen.getByRole('button', { name: /view trip summary/i }))
    expect(screen.getByLabelText(/booking status for City residence apartment/i)).toHaveValue('booked')
  })

  it('goes back to the booking links', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /view trip summary/i }))
    fireEvent.click(screen.getByRole('button', { name: /back to booking links/i }))
    expect(screen.getByRole('heading', { name: /where to book each part/i })).toBeInTheDocument()
  })
})
