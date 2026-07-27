import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCarousel } from './ResultCarousel'
import type { ResultSet } from '@/lib/ui/results'

const set: ResultSet = {
  kind: 'stays', query: 'Rome',
  items: [
    { id: 's1', name: 'Hotel One', source: 'hotel', pricePerNight: 90, nights: 3, photos: [], bookUrl: 'x' },
    { id: 's2', name: 'Hotel Two', source: 'hotel', pricePerNight: 120, nights: 3, photos: [], bookUrl: 'y' },
  ],
}

describe('ResultCarousel', () => {
  it('renders a count label and one card per item', () => {
    render(<ResultCarousel set={set} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText(/2 places to stay/i)).toBeInTheDocument()
    expect(screen.getByText('Hotel One')).toBeInTheDocument()
    expect(screen.getByText('Hotel Two')).toBeInTheDocument()
  })

  it('passes the clicked item to onAdd', () => {
    const onAdd = vi.fn()
    render(<ResultCarousel set={set} onOpen={() => {}} onAdd={onAdd} />)
    fireEvent.click(screen.getAllByRole('button', { name: /add to trip/i })[1])
    expect(onAdd).toHaveBeenCalledWith(set, set.items[1])
  })
})
