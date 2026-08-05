import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaceResultCard } from './PlaceResultCard'
import type { Place } from '@/lib/trip/types'

function place(over: Partial<Place> = {}): Place {
  return { id: 'p1', name: 'Somewhere', photos: [], reviewSnippets: [], sourceLinks: {}, ...over }
}

const noop = () => {}

describe('PlaceResultCard — attractions', () => {
  it('shows whether it is open, because that is when you can turn up', () => {
    render(<PlaceResultCard place={place({ category: 'Museum', openNow: true, hours: '9–18' })} onOpen={noop} onAdd={noop} />)
    expect(screen.getByText('Open now')).toBeInTheDocument()
    expect(screen.getByText('9–18')).toBeInTheDocument()
  })
})

describe('PlaceResultCard — tours', () => {
  it('leaves opening hours off something you book ahead', () => {
    render(
      <PlaceResultCard
        place={place({ category: 'Boat tour agency', openNow: false, hours: '9–18' })}
        onOpen={noop}
        onAdd={noop}
      />,
    )
    expect(screen.queryByText('Closed right now')).not.toBeInTheDocument()
    expect(screen.queryByText('9–18')).not.toBeInTheDocument()
  })
})

describe('PlaceResultCard — events', () => {
  const concert = place({
    name: 'Noa in Concert',
    activityKind: 'event',
    startDate: '2026-08-04',
    whenLabel: 'Tue, Aug 4, 9 PM',
    venueName: 'Casa del Jazz',
    ticketUrl: 'https://tickets.example/1',
  })

  it('leads with when it happens and where', () => {
    render(<PlaceResultCard place={concert} onOpen={noop} onAdd={noop} />)
    expect(screen.getByText('Tue, Aug 4, 9 PM')).toBeInTheDocument()
    expect(screen.getByText('Casa del Jazz')).toBeInTheDocument()
  })

  it('carries no links of its own — the whole card opens the detail, as a stay does', () => {
    const onOpen = vi.fn()
    render(<PlaceResultCard place={concert} onOpen={onOpen} onAdd={noop} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('place-card'))
    expect(onOpen).toHaveBeenCalled()
  })

  it('opens the detail from the keyboard too', () => {
    const onOpen = vi.fn()
    render(<PlaceResultCard place={concert} onOpen={onOpen} onAdd={noop} />)
    fireEvent.keyDown(screen.getByTestId('place-card'), { key: 'Enter' })
    expect(onOpen).toHaveBeenCalled()
  })

  it('warns before you add something that happens after you fly home', () => {
    render(
      <PlaceResultCard
        place={concert}
        tripDates={{ startDate: '2026-08-10', endDate: '2026-08-17' }}
        onOpen={noop}
        onAdd={noop}
      />,
    )
    expect(screen.getByTestId('event-clash')).toHaveTextContent(/not during your trip/i)
  })

  it('says nothing about a clash when the event is during the trip', () => {
    render(
      <PlaceResultCard
        place={concert}
        tripDates={{ startDate: '2026-08-01', endDate: '2026-08-08' }}
        onOpen={noop}
        onAdd={noop}
      />,
    )
    expect(screen.queryByTestId('event-clash')).not.toBeInTheDocument()
  })

  it('falls back to the bare date when the provider gave no range', () => {
    render(
      <PlaceResultCard
        place={place({ activityKind: 'event', startDate: '2026-08-04' })}
        onOpen={noop}
        onAdd={noop}
      />,
    )
    expect(screen.getByText('2026-08-04')).toBeInTheDocument()
  })
})

/**
 * A rating is a number. What a place is actually like comes from a photo and something a visitor
 * said, and the card carried neither until the traveler opened the detail panel.
 */
describe('PlaceResultCard — richer cards', () => {
  it('quotes a real review when the search found one', () => {
    render(
      <PlaceResultCard
        place={place({ reviewSnippets: [{ text: 'Go early, the queue is brutal by ten.' }] })}
        onOpen={noop}
        onAdd={noop}
      />,
    )
    expect(screen.getByTestId('place-quote')).toHaveTextContent('Go early, the queue is brutal by ten.')
  })

  it('flips through its photos without opening the detail, exactly as a stay does', () => {
    const onOpen = vi.fn()
    render(
      <PlaceResultCard
        place={place({ name: 'Mercado 28', photos: ['https://p/1', 'https://p/2', 'https://p/3'] })}
        onOpen={onOpen}
        onAdd={noop}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /photo 2 of Mercado 28/i }))
    expect(screen.getByRole('button', { name: /photo 2 of Mercado 28/i })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('shows no photo dots for a gallery of one', () => {
    render(<PlaceResultCard place={place({ photos: ['https://p/1'] })} onOpen={noop} onAdd={noop} />)
    expect(screen.queryByRole('button', { name: /photo 1 of/i })).not.toBeInTheDocument()
  })

  it('renders cleanly with nothing extra to show', () => {
    render(<PlaceResultCard place={place()} onOpen={noop} onAdd={noop} />)
    expect(screen.queryByTestId('place-quote')).not.toBeInTheDocument()
    expect(screen.getByTestId('place-card')).toBeInTheDocument()
  })

  it('says when it is already in the plan, as state rather than a second button', () => {
    render(<PlaceResultCard place={place()} added onOpen={noop} onAdd={noop} />)
    expect(screen.getByTestId('place-added')).toHaveTextContent('In your plan')
  })

  it('never invents a price when the provider gave none', () => {
    render(<PlaceResultCard place={place({ category: 'Museum' })} onOpen={noop} onAdd={noop} />)
    expect(screen.getByText('place to visit')).toBeInTheDocument()
    expect(screen.queryByText(/free/i)).not.toBeInTheDocument()
  })

  it('shows opening hours for a restaurant, which closes just like a museum', () => {
    render(
      <PlaceResultCard
        place={place({ category: 'Trattoria', openNow: true, hours: '12–23' })}
        onOpen={noop}
        onAdd={noop}
      />,
    )
    expect(screen.getByText('Open now')).toBeInTheDocument()
    expect(screen.getByText('12–23')).toBeInTheDocument()
  })
})
