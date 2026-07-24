import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WatchoutBanner } from './WatchoutBanner'
import type { Watchout } from '@/lib/trip/watchouts'

const items: Watchout[] = [
  { id: 'one-way', severity: 'info', message: 'Only one flight is added — do you want a return?', fixes: [{ label: 'Add a return', prompt: 'x' }] },
]

describe('WatchoutBanner', () => {
  it('renders each watch-out message', () => {
    render(<WatchoutBanner watchouts={items} />)
    expect(screen.getByText(/only one flight is added/i)).toBeInTheDocument()
  })

  it('renders nothing when there are no watch-outs', () => {
    const { container } = render(<WatchoutBanner watchouts={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
