import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StayDetail } from './StayDetail'
import type { Stay } from '@/lib/trip/types'

function stay(over: Partial<Stay> = {}): Stay {
  return {
    id: 's1',
    name: 'Hotel Vander',
    source: 'hotel',
    pricePerNight: 140,
    nights: 3,
    photos: [],
    bookUrl: 'https://book/1',
    ...over,
  }
}

const reviewed = stay({
  reviewTopics: [
    { name: 'service', positive: 300, negative: 5, total: 305 },
    { name: 'noise', positive: 40, negative: 30, total: 70 },
  ],
  reviewSnippets: [
    { text: 'The service was extraordinary from start to finish.', rating: 5 },
    { text: 'Noise from the courtyard woke us early.', rating: 2 },
  ],
  excludedAmenities: ['No parking', 'Ironing service'],
})

describe('StayDetail — cons and watch-outs', () => {
  it('shows nothing when the provider gave no review material', () => {
    render(<StayDetail stay={stay()} />)
    expect(screen.queryByTestId('stay-verdict')).not.toBeInTheDocument()
  })

  it('leads with what guests love, grounded in counts', () => {
    render(<StayDetail stay={reviewed} />)
    expect(screen.getByRole('heading', { name: /what guests love/i })).toBeInTheDocument()
    expect(screen.getByText('Service')).toBeInTheDocument()
    expect(screen.getByText(/300 positive/)).toBeInTheDocument()
  })

  it('tells the traveler what is wrong with the place', () => {
    render(<StayDetail stay={reviewed} />)
    expect(screen.getByRole('heading', { name: /cons and watch-outs/i })).toBeInTheDocument()
    expect(screen.getByText('Noise')).toBeInTheDocument()
  })

  it('backs each finding with a reviewer’s own words', () => {
    render(<StayDetail stay={reviewed} />)
    const verdict = within(screen.getByTestId('stay-verdict'))
    expect(verdict.getByText(/Noise from the courtyard woke us early/)).toBeInTheDocument()
    expect(verdict.getByText(/service was extraordinary/)).toBeInTheDocument()
  })

  it('never shows who wrote a review, here or anywhere on the page', () => {
    const { container } = render(<StayDetail stay={reviewed} />)
    expect(container.textContent).not.toContain('Jane Doe')
    expect(container.textContent).not.toContain('Sam Smith')
  })

  it('lists absences that would change plans', () => {
    render(<StayDetail stay={reviewed} />)
    expect(screen.getByRole('heading', { name: /not available here/i })).toBeInTheDocument()
    expect(screen.getByText('No parking')).toBeInTheDocument()
    expect(screen.queryByText('Ironing service')).not.toBeInTheDocument()
  })
})
