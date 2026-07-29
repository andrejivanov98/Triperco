import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProviderCheckNote } from './ProviderCheckNote'
import { ResultCarousel } from './ResultCarousel'
import type { Stay, Place } from '@/lib/trip/types'

function stay(id: string): Stay {
  return {
    id,
    name: `Hotel ${id}`,
    source: 'hotel',
    pricePerNight: 100,
    nights: 3,
    photos: [],
    bookUrl: 'x',
  }
}

describe('ProviderCheckNote', () => {
  it('tells the traveler to match the search on the provider side', () => {
    render(<ProviderCheckNote kind="stays" />)
    const note = screen.getByTestId('provider-check-note')
    expect(note).toHaveTextContent(/rates are as of this search and can change/i)
    expect(note).toHaveTextContent(/same dates, guests and rooms/i)
    expect(note).toHaveTextContent(/availability and the final price are theirs/i)
  })

  it('says fares and passengers for flights', () => {
    render(<ProviderCheckNote kind="flights" />)
    const note = screen.getByTestId('provider-check-note')
    expect(note).toHaveTextContent(/fares are as of this search/i)
    expect(note).toHaveTextContent(/same dates, airports and passengers/i)
  })
})

describe('where the note appears', () => {
  it('sits under a set of stays, where the choice is made', () => {
    render(
      <ResultCarousel set={{ kind: 'stays', items: [stay('a')] }} onOpen={() => {}} onAdd={() => {}} />,
    )
    expect(screen.getByTestId('provider-check-note')).toBeInTheDocument()
  })

  it('does not clutter a list of things to do, which we do not price', () => {
    const place: Place = {
      id: 'p',
      name: 'Museum',
      photos: [],
      reviewSnippets: [],
      sourceLinks: {},
    }
    render(
      <ResultCarousel set={{ kind: 'places', items: [place] }} onOpen={() => {}} onAdd={() => {}} />,
    )
    expect(screen.queryByTestId('provider-check-note')).not.toBeInTheDocument()
  })
})
