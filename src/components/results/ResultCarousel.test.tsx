import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCarousel } from './ResultCarousel'
import type { Stay } from '@/lib/trip/types'

function stay(id: string, price: number): Stay {
  return {
    id,
    name: `Hotel ${id}`,
    source: 'hotel',
    pricePerNight: price,
    nights: 3,
    photos: [],
    bookUrl: 'x',
  }
}

const items = [stay('a', 90), stay('b', 120)]

describe('ResultCarousel', () => {
  it('renders a count label and one card per item', () => {
    render(
      <ResultCarousel
        set={{ kind: 'stays', query: 'Rome', items }}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    expect(screen.getByText(/2 places to stay/i)).toBeInTheDocument()
    expect(screen.getByText('Hotel a')).toBeInTheDocument()
    expect(screen.getByText('Hotel b')).toBeInTheDocument()
  })

  it('scrolls the options horizontally inside their own track', () => {
    render(
      <ResultCarousel set={{ kind: 'stays', items }} onOpen={() => {}} onAdd={() => {}} />,
    )
    const track = screen.getByTestId('carousel-track')
    // The track owns the horizontal overflow, so the page never scrolls sideways.
    expect(track.className).toContain('overflow-x-auto')
    expect(track.className).toContain('min-w-0')
  })

  it('never lets its own width exceed the column', () => {
    render(
      <ResultCarousel set={{ kind: 'stays', items }} onOpen={() => {}} onAdd={() => {}} />,
    )
    const root = screen.getByTestId('carousel')
    expect(root.className).toContain('min-w-0')
    expect(root.className).toContain('max-w-full')
  })

  it('steps the track left and right from the arrow buttons', () => {
    render(
      <ResultCarousel set={{ kind: 'stays', items }} onOpen={() => {}} onAdd={() => {}} />,
    )
    const track = screen.getByTestId('carousel-track')
    // jsdom has no layout, so fake a scrollable track and let the component re-measure.
    Object.defineProperty(track, 'clientWidth', { value: 500, configurable: true })
    Object.defineProperty(track, 'scrollWidth', { value: 1500, configurable: true })
    fireEvent.scroll(track)

    fireEvent.click(screen.getByRole('button', { name: /scroll right/i }))
    expect(track.scrollLeft).toBeGreaterThan(0)

    const afterRight = track.scrollLeft
    fireEvent.click(screen.getByRole('button', { name: /scroll left/i }))
    expect(track.scrollLeft).toBeLessThan(afterRight)
  })

  it('renders nothing for an empty result set', () => {
    const { container } = render(
      <ResultCarousel set={{ kind: 'stays', items: [] }} onOpen={() => {}} onAdd={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('opens the details when the stay card is tapped anywhere', () => {
    // The card carries no controls of its own: it is one object, and adding happens in the detail.
    const onOpen = vi.fn()
    const onAdd = vi.fn()
    render(
      <ResultCarousel set={{ kind: 'stays', items: [items[0]] }} onOpen={onOpen} onAdd={onAdd} />,
    )
    fireEvent.click(screen.getByTestId('stay-card'))
    expect(onOpen).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^add to trip$/i })).not.toBeInTheDocument()
  })

  it('opens the stay details from the keyboard too', () => {
    const onOpen = vi.fn()
    render(<ResultCarousel set={{ kind: 'stays', items: [items[0]] }} onOpen={onOpen} onAdd={() => {}} />)
    fireEvent.keyDown(screen.getByTestId('stay-card'), { key: 'Enter' })
    expect(onOpen).toHaveBeenCalled()
  })

  it('renders flights as itinerary cards with times and route', () => {
    render(
      <ResultCarousel
        set={{
          kind: 'flights',
          items: [
            {
              id: 'f1',
              from: 'SKP',
              to: 'FCO',
              airline: 'Wizz Air',
              departTime: '16:10',
              arriveTime: '17:55',
              durationMinutes: 105,
              stops: 0,
              price: 36,
              bookUrl: 'x',
            },
          ],
        }}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    expect(screen.getByText('16:10')).toBeInTheDocument()
    expect(screen.getByText('17:55')).toBeInTheDocument()
    expect(screen.getByText('SKP')).toBeInTheDocument()
    expect(screen.getByText('1h 45m')).toBeInTheDocument()
    expect(screen.getByText('Nonstop')).toBeInTheDocument()
  })

  it('shows the stay details, not just a photo', () => {
    const detailed: Stay[] = [
      {
        ...stay('a', 165),
        name: 'City Break Studio',
        kind: 'vacation_rental',
        rating: 4.7,
        reviewCount: 181,
        totalPrice: 494,
        address: 'Trnovo, Ljubljana',
        essentialInfo: ['Entire apartment', 'Sleeps 4', '1 bedroom'],
        amenities: ['Free Wi-Fi', 'Kitchen', 'Air conditioning'],
        checkInTime: '3:00 PM',
      },
    ]
    render(<ResultCarousel set={{ kind: 'stays', items: detailed }} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText('City Break Studio')).toBeInTheDocument()
    expect(screen.getByText(/4\.7 ★ · 181 reviews/)).toBeInTheDocument()
    expect(screen.getByText(/Entire place · Trnovo/)).toBeInTheDocument()
    expect(screen.getByText(/Sleeps 4/)).toBeInTheDocument()
    expect(screen.getByText('$165')).toBeInTheDocument()
    expect(screen.getByText('/ night')).toBeInTheDocument()
    expect(screen.getByText(/\$494 · 3 nights/)).toBeInTheDocument()
    // Amenities read as icon chips now, so the decisive ones are named.
    expect(screen.getByText('Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Wi-Fi')).toBeInTheDocument()
    expect(screen.getByText('A/C')).toBeInTheDocument()
  })

  it('will not offer to add a place that has closed down', () => {
    render(
      <ResultCarousel
        set={{
          kind: 'places',
          items: [
            {
              id: 'p1',
              name: 'Old Bar',
              photos: [],
              reviewSnippets: [],
              sourceLinks: {},
              permanentlyClosed: true,
            },
          ],
        }}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    // Closed-down places are filtered out of results entirely.
    expect(screen.queryByText('Old Bar')).not.toBeInTheDocument()
  })

  it('flips between a stay photos without leaving the card', () => {
    // The gallery itself lives in the detail panel now; the card just previews.
    const withPhotos: Stay[] = [{ ...stay('a', 90), photos: ['https://p/1', 'https://p/2'] }]
    const onOpen = vi.fn()
    render(<ResultCarousel set={{ kind: 'stays', items: withPhotos }} onOpen={onOpen} onAdd={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /photo 2 of Hotel a/i }))
    expect(screen.getByRole('button', { name: /photo 2 of Hotel a/i })).toHaveAttribute(
      'aria-current',
      'true',
    )
    // Flipping a photo must not open the detail panel by accident.
    expect(onOpen).not.toHaveBeenCalled()
  })
})
