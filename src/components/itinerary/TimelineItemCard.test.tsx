import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineItemCard } from './TimelineItemCard'
import type { TimelineItem } from '@/lib/trip/timeline'

const stay: TimelineItem = {
  kind: 'stay', id: 's1', title: "Guido's Apartments", subtitle: 'Home',
  price: 1462, priceUnit: 'total', thumbnail: 'https://img/x.jpg',
  bookUrl: 'https://airbnb/1', bookLabel: 'Book on Airbnb', bookingStatus: 'not_booked',
}

describe('TimelineItemCard', () => {
  it('renders title, price and a NOT BOOKED status', () => {
    render(<TimelineItemCard item={stay} />)
    expect(screen.getByText("Guido's Apartments")).toBeInTheDocument()
    expect(screen.getByText('$1,462')).toBeInTheDocument()
    expect(screen.getByText(/not booked/i)).toBeInTheDocument()
  })

  it('links out to the provider with a book label', () => {
    render(<TimelineItemCard item={stay} />)
    const link = screen.getByRole('link', { name: /book on airbnb/i })
    expect(link).toHaveAttribute('href', 'https://airbnb/1')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
