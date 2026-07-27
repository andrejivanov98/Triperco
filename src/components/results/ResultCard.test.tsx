import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCard } from './ResultCard'
import type { Flight, Stay, Place } from '@/lib/trip/types'

const flight: Flight = {
  id: 'f1',
  from: 'SKP',
  to: 'FCO',
  airline: 'Lufthansa',
  departTime: '06:15',
  arriveTime: '11:30',
  durationMinutes: 315,
  stops: 1,
  price: 240,
  bookUrl: 'https://book/f',
  layovers: [{ code: 'MUC', durationMinutes: 95 }],
}

const stay: Stay = {
  id: 's1',
  name: 'Palazzo Nazionale',
  source: 'hotel',
  kind: 'hotel',
  rating: 4.6,
  reviewCount: 1204,
  pricePerNight: 180,
  nights: 4,
  photos: ['https://p/1'],
  bookUrl: 'https://book/s',
  hotelClass: '5-star hotel',
}

const place: Place = {
  id: 'p1',
  name: 'Roscioli',
  category: 'Italian restaurant',
  rating: 4.5,
  reviewCount: 8100,
  priceRange: '$$$',
  photos: [],
  reviewSnippets: [],
  openNow: true,
  sourceLinks: {},
}

describe('ResultCard (flight)', () => {
  it('shows the route, times, duration and where it connects', () => {
    render(<ResultCard kind="flights" item={flight} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText(/SKP/)).toBeInTheDocument()
    expect(screen.getByText(/FCO/)).toBeInTheDocument()
    expect(screen.getByText(/06:15/)).toBeInTheDocument()
    expect(screen.getByText(/5h 15m/)).toBeInTheDocument()
    expect(screen.getByText(/1 stop · MUC/)).toBeInTheDocument()
  })

  it('shows the price per traveler', () => {
    render(<ResultCard kind="flights" item={flight} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText('$240')).toBeInTheDocument()
    expect(screen.getByText(/per traveler/i)).toBeInTheDocument()
  })

  it('renders its badges', () => {
    render(
      <ResultCard
        kind="flights"
        item={flight}
        badges={['Best value', 'Cheapest']}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    expect(screen.getByText('Best value')).toBeInTheDocument()
    expect(screen.getByText('Cheapest')).toBeInTheDocument()
  })
})

describe('ResultCard (stay)', () => {
  it('shows class, rating, review count and both prices', () => {
    render(<ResultCard kind="stays" item={stay} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText('Palazzo Nazionale')).toBeInTheDocument()
    expect(screen.getByText(/5-star hotel/)).toBeInTheDocument()
    expect(screen.getByText(/4\.6/)).toBeInTheDocument()
    expect(screen.getByText(/1,204/)).toBeInTheDocument()
    expect(screen.getByText('$180')).toBeInTheDocument()
    expect(screen.getByText(/\$720 total/)).toBeInTheDocument()
  })

  it('calls onOpen from the card body and onAdd from the Add button', () => {
    const onOpen = vi.fn()
    const onAdd = vi.fn()
    render(<ResultCard kind="stays" item={stay} onOpen={onOpen} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    expect(onOpen).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /add to trip/i }))
    expect(onAdd).toHaveBeenCalled()
  })
})

describe('ResultCard (place)', () => {
  it('shows category, price range and open state', () => {
    render(<ResultCard kind="places" item={place} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText(/Italian restaurant/)).toBeInTheDocument()
    expect(screen.getByText(/\$\$\$/)).toBeInTheDocument()
    expect(screen.getByText(/open now/i)).toBeInTheDocument()
  })
})
