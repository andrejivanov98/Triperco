import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('sends you to the ticket seller rather than a map', () => {
    render(<PlaceResultCard place={concert} onOpen={noop} onAdd={noop} />)
    const link = screen.getByRole('link', { name: /tickets/i })
    expect(link).toHaveAttribute('href', 'https://tickets.example/1')
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
