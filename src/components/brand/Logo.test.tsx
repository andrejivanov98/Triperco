import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo, LogoMark } from './Logo'

describe('LogoMark', () => {
  it('is one colour, taking it from the surrounding text', () => {
    const { container } = render(<LogoMark />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('fill', 'currentColor')
    // No second colour anywhere: no fills, gradients or opacity tricks.
    expect(container.innerHTML).not.toMatch(/gradient|#[0-9a-f]{3,6}|fill-opacity/i)
  })

  it('is built from exactly three marks: the trail, the plane and the pin', () => {
    const { container } = render(<LogoMark />)
    expect(container.querySelectorAll('path')).toHaveLength(3)
  })

  it('draws the flight path lighter than the plane it carries', () => {
    const { container } = render(<LogoMark />)
    const trail = container.querySelector('path[stroke]')!
    expect(Number(trail.getAttribute('stroke-width'))).toBeLessThan(2)
    expect(trail).toHaveAttribute('fill', 'none')
    expect(trail).toHaveAttribute('stroke-linecap', 'round')
  })

  it('cuts the pin’s eye out instead of covering it with a second shape', () => {
    // A filled circle on top would show a seam the moment the mark sits on a photo.
    const { container } = render(<LogoMark />)
    const pin = [...container.querySelectorAll('path')].find((p) => p.getAttribute('fill-rule'))
    expect(pin).toHaveAttribute('fill-rule', 'evenodd')
  })

  it('scales from any size, because nothing is pinned to pixels', () => {
    const { container } = render(<LogoMark className="h-40 w-40" />)
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 32 32')
  })

  it('is decorative, so the name beside it carries the meaning', () => {
    const { container } = render(<LogoMark />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Logo', () => {
  it('sets the name in the display face', () => {
    render(<Logo />)
    expect(screen.getByText('Triperco').className).toContain('font-display')
  })

  it('can be the mark alone', () => {
    render(<Logo showWordmark={false} />)
    expect(screen.queryByText('Triperco')).not.toBeInTheDocument()
  })
})
