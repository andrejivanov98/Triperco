import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TripSummarySheet } from './TripSummarySheet'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from '@/lib/trip/tripState'
import type { TripState } from '@/lib/trip/types'

/**
 * The summary is read on a phone while travelling. An address as plain text has to be selected,
 * copied and pasted into another app; the same address as a link is one tap to walking directions.
 */
function trip(): TripState {
  const base = setMeta(createTrip('t1'), { destination: 'Rome', travelers: 2 })
  const withFlight = addFlight(base, {
    id: 'f1',
    from: 'SKP',
    to: 'FCO',
    stops: 0,
    price: 120,
    bookUrl: 'https://airline.example/f1',
  })
  const withStay = addStay(withFlight, {
    id: 's1',
    name: 'Hotel Artemide',
    source: 'hotel',
    pricePerNight: 120,
    nights: 3,
    photos: [],
    bookUrl: 'https://hotels.example/s1',
    address: 'Via Nazionale 22, Rome',
    phone: '+39 06 489 911',
    coords: { lat: 41.895, lng: 12.494 },
  })
  return addItineraryItem(withStay, 0, {
    placeId: 'PID1',
    name: 'Colosseum',
    address: 'Piazza del Colosseo, Rome',
  })
}

function hrefs(name: RegExp): string[] {
  return screen.getAllByRole('link', { name }).map((a) => a.getAttribute('href') ?? '')
}

describe('TripSummarySheet — links you can press', () => {
  it('gives the stay directions, a map, a phone number and its booking', () => {
    render(<TripSummarySheet trip={trip()} />)
    expect(hrefs(/directions/i)[0]).toContain('google.com/maps/dir')
    expect(hrefs(/on the map/i)[0]).toContain('google.com/maps')
    expect(hrefs(/call/i)[0]).toBe('tel:+3906489911')
    expect(hrefs(/booking/i)[0]).toBe('https://hotels.example/s1')
  })

  it('routes the stay by coordinates, not by a name two hotels could share', () => {
    render(<TripSummarySheet trip={trip()} />)
    expect(hrefs(/directions/i)[0]).toContain('41.895%2C12.494')
  })

  it('gives each thing to do directions and its details', () => {
    render(<TripSummarySheet trip={trip()} />)
    // Two "Directions" links now: the stay and the Colosseum.
    expect(hrefs(/directions/i)).toHaveLength(2)
    expect(hrefs(/details/i)[0]).toContain('place_id:PID1')
  })

  it('links the flight to where the fare can be checked', () => {
    render(<TripSummarySheet trip={trip()} />)
    expect(hrefs(/check the fare/i)[0]).toBe('https://airline.example/f1')
  })

  it('opens every link in a new tab, so the summary is never navigated away from', () => {
    render(<TripSummarySheet trip={trip()} />)
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })

  it('keeps the addresses as text too, because a link is worthless on paper', () => {
    render(<TripSummarySheet trip={trip()} />)
    expect(screen.getByText('Via Nazionale 22, Rome')).toBeInTheDocument()
    expect(screen.getByText('Piazza del Colosseo, Rome')).toBeInTheDocument()
  })

  it('renders without links when the plan carries nothing to link to', () => {
    const bare = addItineraryItem(setMeta(createTrip('t1'), { destination: 'Rome' }), 0, {
      placeId: '',
      name: 'A walk',
    })
    render(<TripSummarySheet trip={bare} />)
    expect(screen.getByText('A walk')).toBeInTheDocument()
    // A name alone is still enough to search a map for, so directions stay available.
    expect(screen.queryAllByRole('link', { name: /call/i })).toHaveLength(0)
  })
})
