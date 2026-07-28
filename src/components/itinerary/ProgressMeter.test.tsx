import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProgressMeter } from './ProgressMeter'
import { createTrip } from '@/lib/trip/tripState'
import type { Flight, Stay, TripState } from '@/lib/trip/types'

function flight(id: string, over: Partial<Flight> = {}): Flight {
  return { id, from: 'SKP', to: 'FCO', stops: 0, price: 100, bookUrl: 'x', ...over }
}

function stay(id: string): Stay {
  return { id, name: 'Hotel', source: 'hotel', pricePerNight: 100, nights: 3, photos: [], bookUrl: 'x' }
}

function trip(over: Partial<TripState> = {}): TripState {
  return { ...createTrip('t1'), ...over }
}

describe('ProgressMeter', () => {
  it('names the three things a trip needs', () => {
    render(<ProgressMeter trip={trip()} />)
    expect(screen.getByText('Where to')).toBeInTheDocument()
    expect(screen.getByText('Getting there')).toBeInTheDocument()
    expect(screen.getByText('Somewhere to sleep')).toBeInTheDocument()
  })

  it('counts what is done against what is needed', () => {
    render(<ProgressMeter trip={trip({ meta: { travelers: 2, destination: 'Rome' } })} />)
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
    expect(screen.getByText(/still to sort/i)).toBeInTheDocument()
  })

  it('shows the leg count when a trip needs two flights', () => {
    const state = trip({
      meta: { travelers: 2, destination: 'Rome', startDate: '2026-08-01', endDate: '2026-08-08' },
      flights: [flight('a')],
    })
    render(<ProgressMeter trip={state} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('says the trip is covered once nothing is missing', () => {
    const state = trip({
      meta: { travelers: 2, destination: 'Rome' },
      flights: [flight('a'), flight('b', { direction: 'return' })],
      stays: [stay('s')],
    })
    render(<ProgressMeter trip={state} />)
    expect(screen.getByText(/trip covered/i)).toBeInTheDocument()
  })

  it('offers one tap to close the first gap', () => {
    const onAsk = vi.fn()
    render(<ProgressMeter trip={trip({ meta: { travelers: 2, destination: 'Rome' } })} onAsk={onAsk} />)
    fireEvent.click(screen.getByRole('button', { name: /find me flights/i }))
    expect(onAsk).toHaveBeenCalledWith('Find me flights')
  })

  it('offers nothing to do once the trip is covered', () => {
    const state = trip({
      meta: { travelers: 2, destination: 'Rome' },
      flights: [flight('a'), flight('b', { direction: 'return' })],
      stays: [stay('s')],
    })
    render(<ProgressMeter trip={state} onAsk={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
