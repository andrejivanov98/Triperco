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

  it('opens details and adds from a card', () => {
    const onOpen = vi.fn()
    const onAdd = vi.fn()
    render(
      <ResultCarousel set={{ kind: 'stays', items }} onOpen={onOpen} onAdd={onAdd} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /view details for Hotel a/i }))
    expect(onOpen).toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: /add to trip/i })[0])
    expect(onAdd).toHaveBeenCalled()
  })
})
