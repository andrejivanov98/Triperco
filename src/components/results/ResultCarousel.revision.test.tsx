import { describe, it, expect } from 'vitest'
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
const set = { kind: 'stays', query: 'Rome', items } as const

describe('ResultCarousel — superseded sets', () => {
  it('shows the cards when this is the live set', () => {
    render(
      <ResultCarousel
        set={set}
        revision={{ revision: 1, superseded: false }}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    expect(screen.getByText('Hotel a')).toBeInTheDocument()
    expect(screen.queryByTestId('superseded-set')).not.toBeInTheDocument()
  })

  it('collapses to one line once a newer search answered the same question', () => {
    render(
      <ResultCarousel
        set={set}
        revision={{ revision: 1, superseded: true }}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    expect(screen.getByTestId('superseded-set')).toBeInTheDocument()
    expect(screen.queryByText('Hotel a')).not.toBeInTheDocument()
    expect(screen.getByText(/earlier search/i)).toBeInTheDocument()
  })

  it('keeps the earlier results reachable rather than deleting them', () => {
    render(
      <ResultCarousel
        set={set}
        revision={{ revision: 1, superseded: true }}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    fireEvent.click(screen.getByTestId('superseded-set'))
    expect(screen.getByText('Hotel a')).toBeInTheDocument()
    expect(screen.getByText('Hotel b')).toBeInTheDocument()
  })

  it('marks a refined set as updated, so a changed list is not mistaken for a new one', () => {
    render(
      <ResultCarousel
        set={set}
        revision={{ revision: 2, superseded: false }}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    expect(screen.getByTestId('revised-badge')).toHaveTextContent(/updated/i)
  })

  it('does not call a first search updated', () => {
    render(
      <ResultCarousel
        set={set}
        revision={{ revision: 1, superseded: false }}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    )
    expect(screen.queryByTestId('revised-badge')).not.toBeInTheDocument()
  })

  it('behaves like a live set when no revision is supplied', () => {
    render(<ResultCarousel set={set} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText('Hotel a')).toBeInTheDocument()
    expect(screen.queryByTestId('superseded-set')).not.toBeInTheDocument()
  })
})
