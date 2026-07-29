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
    expect(screen.getByRole('link', { name: /book on Airbnb/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /book on Wizz Air/i })).toBeInTheDocument()
  })

  it('sends the traveler to the stay with their dates and party already applied', () => {
    // The provider's own link is an opaque redirect that loses the dates, so we rebuild it.
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    const href = screen.getByRole('link', { name: /book on Airbnb/i }).getAttribute('href') ?? ''
    const url = new URL(href)
    expect(url.hostname).toBe('www.airbnb.com')
    expect(url.pathname).toContain('City%20residence%20apartment')
    expect(url.searchParams.get('checkin')).toBe('2026-08-07')
    expect(url.searchParams.get('checkout')).toBe('2026-08-10')
    expect(url.searchParams.get('adults')).toBe('2')
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
    fireEvent.click(screen.getByRole('button', { name: /booking status for City residence apartment/i }))
    fireEvent.click(screen.getByRole('option', { name: /confirmed/i }))
    expect(screen.getByText(/1 of 2 booked/i)).toBeInTheDocument()
  })

  it('reports the change so the plan can remember it', () => {
    const onStatusChange = vi.fn()
    render(<BookingPanel trip={trip()} onClose={() => {}} onStatusChange={onStatusChange} />)
    fireEvent.click(screen.getByRole('button', { name: /booking status for City residence apartment/i }))
    fireEvent.click(screen.getByRole('option', { name: /^booked$/i }))
    expect(onStatusChange).toHaveBeenCalledWith('stay:s1', 'booked')
  })

  it('starts from what the plan already recorded', () => {
    render(
      <BookingPanel trip={{ ...trip(), bookings: { 'stay:s1': 'confirmed' } }} onClose={() => {}} />,
    )
    expect(
      screen.getByRole('button', { name: /booking status for City residence apartment/i }),
    ).toHaveTextContent(/confirmed/i)
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
    // Two copies exist on purpose: the one on screen, and the one queued for the printer.
    expect(screen.getAllByRole('heading', { name: /Ljubljana Weekend Getaway/i })).toHaveLength(2)
    expect(screen.getAllByText(/Aug 7 – 10 · 2 travelers/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /print \/ save pdf/i })).toBeInTheDocument()
  })

  it('keeps recorded statuses when you go to the summary and back', () => {
    // The summary is a document you print, so it carries no controls — the statuses live here.
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /booking status for City residence apartment/i }))
    fireEvent.click(screen.getByRole('option', { name: /^booked$/i }))
    fireEvent.click(screen.getByRole('button', { name: /view trip summary/i }))
    fireEvent.click(screen.getByRole('button', { name: /back to booking links/i }))
    expect(
      screen.getByRole('button', { name: /booking status for City residence apartment/i }),
    ).toHaveTextContent(/booked/i)
  })

  it('puts a real printable copy of the plan outside the dialog', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /view trip summary/i }))

    // The dialog is clipped and fixed, so the printed copy lives directly under <body>.
    const sheet = document.querySelector('.print-sheet')
    expect(sheet).not.toBeNull()
    expect(sheet?.closest('[role="dialog"]')).toBeNull()
    expect(sheet?.textContent).toContain('Ljubljana Weekend Getaway')
    expect(sheet?.textContent).toContain('City residence apartment')
    expect(sheet?.textContent).toMatch(/SKP → LJU/)
    expect(sheet?.textContent).toMatch(/total/i)
  })

  it('keeps the printable copy away from the printer until there is a summary', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    expect(document.querySelector('.print-sheet')).toBeNull()
  })

  it('goes back to the booking links', () => {
    render(<BookingPanel trip={trip()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /view trip summary/i }))
    fireEvent.click(screen.getByRole('button', { name: /back to booking links/i }))
    expect(screen.getByRole('heading', { name: /where to book each part/i })).toBeInTheDocument()
  })
})
