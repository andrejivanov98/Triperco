import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecapCard } from './RecapCard'
import type { TripRecapCard } from '@/lib/ui/interactions'

const recap: TripRecapCard = {
  title: 'Roman Spring',
  subtitle: 'Rome · Mar 19 – 24 · 2 travelers',
  steps: [
    'Fly out: SKP → FCO · 2027-03-19, 07:15–09:05 · Wizz Air, 1h 50m, Nonstop · $240',
    'Stay at Hotel Artemide · 5 nights · Via Nazionale 22, Rome · $600',
    'Do: Colosseum · Historical landmark',
  ],
  total: '$1,120',
  url: 'https://triperco.test/trip/abc123',
}

describe('RecapCard', () => {
  it('names the trip and says it is planned', () => {
    render(<RecapCard recap={recap} />)
    expect(screen.getByText('Roman Spring')).toBeInTheDocument()
    expect(screen.getByText(/your trip is planned/i)).toBeInTheDocument()
    expect(screen.getByText('Rome · Mar 19 – 24 · 2 travelers')).toBeInTheDocument()
  })

  /** An itinerary is an order of events, so it is numbered rather than bulleted. */
  it('lists every step in order', () => {
    render(<RecapCard recap={recap} />)
    const steps = [...screen.getByTestId('trip-recap').querySelectorAll('li')]
    expect(steps).toHaveLength(3)
    expect(steps[0].textContent).toContain('SKP → FCO')
    expect(steps[2].textContent).toContain('Colosseum')
    expect(screen.getByTestId('trip-recap').querySelector('ol')).not.toBeNull()
  })

  it('shows the total', () => {
    render(<RecapCard recap={recap} />)
    expect(screen.getByText('$1,120')).toBeInTheDocument()
  })

  /*
   * The link is the thing that turns a chat they will lose into something they can send to the
   * people coming with them — so it is a button *and* readable text, because a link you cannot see
   * is a link you cannot copy.
   */
  it('hands over the link, in full', () => {
    render(<RecapCard recap={recap} />)
    const link = screen.getByRole('link', { name: /open the trip summary/i })
    expect(link).toHaveAttribute('href', 'https://triperco.test/trip/abc123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText('https://triperco.test/trip/abc123')).toBeInTheDocument()
  })

  /** A trip that could not be saved still has a summary — it just lives in the panel. */
  it('falls back to opening the summary panel when there is no link', () => {
    const onOpenSummary = vi.fn()
    render(<RecapCard recap={{ ...recap, url: undefined }} onOpenSummary={onOpenSummary} />)
    expect(screen.queryByRole('link', { name: /open the trip summary/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /open the trip summary/i }))
    expect(onOpenSummary).toHaveBeenCalled()
  })

  it('leaves the total off when the plan has no priced part', () => {
    render(<RecapCard recap={{ ...recap, total: undefined }} />)
    expect(screen.queryByText(/trip total/i)).not.toBeInTheDocument()
  })
})
