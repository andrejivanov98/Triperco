import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Lightbox } from './Lightbox'

const photos = ['https://p/1', 'https://p/2', 'https://p/3']

describe('Lightbox', () => {
  it('opens on the chosen photo and counts them', () => {
    render(<Lightbox photos={photos} startIndex={1} title="Palazzo" onClose={() => {}} />)
    expect(screen.getByAltText(/photo 2 of 3/i)).toHaveAttribute('src', 'https://p/2')
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('steps forward and back', () => {
    render(<Lightbox photos={photos} title="Palazzo" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /next photo/i }))
    expect(screen.getByAltText(/photo 2 of 3/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /previous photo/i }))
    expect(screen.getByAltText(/photo 1 of 3/i)).toBeInTheDocument()
  })

  it('wraps around at both ends', () => {
    render(<Lightbox photos={photos} title="Palazzo" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /previous photo/i }))
    expect(screen.getByAltText(/photo 3 of 3/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next photo/i }))
    expect(screen.getByAltText(/photo 1 of 3/i)).toBeInTheDocument()
  })

  it('responds to arrow keys', () => {
    render(<Lightbox photos={photos} title="Palazzo" onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByAltText(/photo 2 of 3/i)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByAltText(/photo 1 of 3/i)).toBeInTheDocument()
  })

  it('closes on the button and on Escape', () => {
    const onClose = vi.fn()
    render(<Lightbox photos={photos} title="Palazzo" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /^close ✕$/i }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('hides the arrows for a single photo', () => {
    render(<Lightbox photos={['https://p/1']} title="Palazzo" onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /next photo/i })).not.toBeInTheDocument()
  })

  it('renders nothing with no photos', () => {
    const { container } = render(<Lightbox photos={[]} title="Palazzo" onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
