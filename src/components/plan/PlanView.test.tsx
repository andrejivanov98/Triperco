import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanView } from './PlanView'
import { createTrip, setMeta, addFlight } from '@/lib/trip/tripState'

describe('PlanView', () => {
  it('shows an empty hint and $0 total for a fresh trip', () => {
    render(<PlanView trip={createTrip('t1')} />)
    expect(screen.getByText(/plan will appear/i)).toBeInTheDocument()
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  it('renders destination, a flight, and the running total', () => {
    let trip = setMeta(createTrip('t1'), { destination: 'Rome' })
    trip = addFlight(trip, { id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 180, bookUrl: 'https://a' })
    render(<PlanView trip={trip} />)
    expect(screen.getByText('Rome')).toBeInTheDocument()
    expect(screen.getByText(/SKP/)).toBeInTheDocument()
    expect(screen.getByText('$180')).toBeInTheDocument()
  })
})
