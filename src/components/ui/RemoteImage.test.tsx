import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RemoteImage } from './RemoteImage'

describe('RemoteImage', () => {
  it('renders the photo without leaking a referrer', () => {
    render(<RemoteImage src="https://p/1" alt="Palazzo" />)
    const img = screen.getByAltText('Palazzo')
    expect(img).toHaveAttribute('src', 'https://p/1')
    // Some provider CDNs reject hotlinked requests that carry a referrer.
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('falls back to a glyph tile when the photo fails to load', () => {
    render(<RemoteImage src="https://p/dead" alt="Palazzo" fallbackGlyph="🏨" />)
    fireEvent.error(screen.getByAltText('Palazzo'))
    expect(screen.getByRole('img', { name: 'Palazzo' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Palazzo' })?.tagName).not.toBe('IMG')
  })

  it('falls back when there is no url at all', () => {
    render(<RemoteImage alt="Nothing" />)
    expect(screen.getByRole('img', { name: 'Nothing' }).tagName).not.toBe('IMG')
  })

  it('gives a replacement url a fresh chance', () => {
    const { rerender } = render(<RemoteImage src="https://p/dead" alt="Palazzo" />)
    fireEvent.error(screen.getByAltText('Palazzo'))
    rerender(<RemoteImage src="https://p/good" alt="Palazzo" />)
    expect(screen.getByAltText('Palazzo')).toHaveAttribute('src', 'https://p/good')
  })
})
