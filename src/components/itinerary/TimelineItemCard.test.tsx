import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineItemCard } from './TimelineItemCard'
import type { TimelineItem } from '@/lib/trip/timeline'

const stay: TimelineItem = {
  kind: 'stay', id: 's1', title: "Guido's Apartments", subtitle: 'Home',
  price: 1462, priceUnit: 'total', thumbnail: 'https://img/x.jpg',
  bookUrl: 'https://airbnb/1', bookLabel: 'Book on Airbnb', bookingStatus: 'not_booked',
  rating: 4.8, reviewCount: 56, description: 'Bright top-floor flat by the river.',
}

function expand() {
  fireEvent.click(screen.getByRole('button', { name: /show options for Guido's Apartments/i }))
}

describe('TimelineItemCard', () => {
  it('renders title and price when collapsed', () => {
    render(<TimelineItemCard item={stay} />)
    expect(screen.getByText("Guido's Apartments")).toBeInTheDocument()
    expect(screen.getByText('$1,462')).toBeInTheDocument()
  })

  it('keeps the actions out of the way until expanded', () => {
    render(<TimelineItemCard item={stay} onRemove={() => {}} />)
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument()
    expand()
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument()
    expect(screen.getByText(/not booked/i)).toBeInTheDocument()
  })

  it('links out to the provider with a book label once expanded', () => {
    render(<TimelineItemCard item={stay} onRemove={() => {}} />)
    expand()
    const link = screen.getByRole('link', { name: /book on airbnb/i })
    expect(link).toHaveAttribute('href', 'https://airbnb/1')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('shows the rating and description when expanded', () => {
    render(<TimelineItemCard item={stay} onRemove={() => {}} />)
    expand()
    expect(screen.getByText(/4\.8/)).toBeInTheDocument()
    expect(screen.getByText(/bright top-floor flat/i)).toBeInTheDocument()
  })

  it('removes the item', () => {
    const onRemove = vi.fn()
    render(<TimelineItemCard item={stay} onRemove={onRemove} />)
    expand()
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    expect(onRemove).toHaveBeenCalledWith(stay)
  })

  it('opens the full details', () => {
    const onViewDetails = vi.fn()
    render(<TimelineItemCard item={stay} onViewDetails={onViewDetails} />)
    expand()
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    expect(onViewDetails).toHaveBeenCalledWith(stay)
  })

  it('does not offer to expand when there is nothing to do', () => {
    const bare: TimelineItem = { kind: 'activity', id: 'a1', title: 'Old town walk', bookingStatus: 'not_booked' }
    render(<TimelineItemCard item={bare} />)
    expect(screen.queryByRole('button', { name: /show options/i })).not.toBeInTheDocument()
  })

  it('marks a booked item', () => {
    render(<TimelineItemCard item={{ ...stay, bookingStatus: 'booked' }} onRemove={() => {}} />)
    expand()
    expect(screen.getByText(/● booked/i)).toBeInTheDocument()
  })
})

/**
 * A flight row used to be the only one with nothing in its tile, so every leg of every trip looked
 * identical. The airline's own logo is the fastest possible way to tell them apart — but it is a mark
 * on white, not a photograph, so cropping it to fill the tile leaves a slice of coloured square with
 * no logo in it.
 */
describe('TimelineItemCard — the airline on a flight row', () => {
  const flight: TimelineItem = {
    kind: 'flight',
    id: 'f1',
    title: 'SKP → FCO',
    subtitle: 'Wizz Air · Nonstop',
    logo: 'https://logos/wizz.png',
    price: 120,
    priceUnit: 'total',
    bookingStatus: 'not_booked',
  }

  it('shows the logo, named after the airline', () => {
    render(<TimelineItemCard item={flight} />)
    const img = screen.getByAltText('Wizz Air')
    expect(img).toHaveAttribute('src', 'https://logos/wizz.png')
  })

  it('contains the mark rather than cropping it', () => {
    render(<TimelineItemCard item={flight} />)
    const img = screen.getByAltText('Wizz Air')
    expect(img.className).toContain('object-contain')
    expect(img.className).not.toContain('object-cover')
  })

  it('falls back to the plane glyph when the airline gave no logo', () => {
    render(<TimelineItemCard item={{ ...flight, logo: undefined }} />)
    expect(screen.getByRole('img', { name: 'SKP → FCO' })).toBeInTheDocument()
  })

  it('leaves a photo cropped to fill its tile', () => {
    render(<TimelineItemCard item={stay} />)
    expect(screen.getByAltText("Guido's Apartments").className).toContain('object-cover')
  })
})
