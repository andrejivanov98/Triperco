import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WatchoutBanner } from './WatchoutBanner'
import type { Watchout } from '@/lib/trip/watchouts'

const items: Watchout[] = [
  { id: 'one-way', severity: 'info', message: 'Only one flight is added — do you want a return?', fixes: [{ label: 'Add a return', prompt: 'Find a return flight for my trip.' }] },
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

  it('sends the fix prompt when a fix button is clicked (onFix provided)', () => {
    const onFix = vi.fn()
    render(<WatchoutBanner watchouts={items} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a return' }))
    expect(onFix).toHaveBeenCalledWith('Find a return flight for my trip.')
  })

  it('renders fixes as static chips (no buttons) when onFix is absent', () => {
    render(<WatchoutBanner watchouts={items} />)
    expect(screen.queryByRole('button', { name: 'Add a return' })).toBeNull()
    expect(screen.getByText('Add a return')).toBeInTheDocument()
  })
})
