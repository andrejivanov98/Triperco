import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StayCard } from './StayCard'
import type { Stay } from '@/lib/trip/types'

const stay: Stay = {
  id: 's1', name: 'Hotel Trastevere', source: 'hotel',
  rating: 4.6, reviewCount: 1204, pricePerNight: 110, nights: 3,
  photos: [], bookUrl: 'https://book/hotel',
}

describe('StayCard', () => {
  it('shows name, rating, nightly price and a booking link', () => {
    render(<StayCard stay={stay} />)
    expect(screen.getByText(/Hotel Trastevere/)).toBeInTheDocument()
    expect(screen.getByText(/4\.6/)).toBeInTheDocument()
    expect(screen.getByText(/\$110/)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://book/hotel')
  })
})
