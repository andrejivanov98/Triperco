import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlightCard } from './FlightCard'
import type { Flight } from '@/lib/trip/types'

const flight: Flight = {
  id: 'f1', from: 'SKP', to: 'FCO', airline: 'Wizz Air',
  departTime: '10:00', arriveTime: '12:10', stops: 0, price: 180, bookUrl: 'https://air/book',
}

describe('FlightCard', () => {
  it('shows route, airline, price, and a booking link', () => {
    render(<FlightCard flight={flight} />)
    expect(screen.getByText(/SKP/)).toBeInTheDocument()
    expect(screen.getByText(/FCO/)).toBeInTheDocument()
    expect(screen.getByText(/Wizz Air/)).toBeInTheDocument()
    expect(screen.getByText(/\$180/)).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://air/book')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
