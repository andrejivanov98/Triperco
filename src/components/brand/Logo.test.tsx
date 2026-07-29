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

describe('Logo — the mark inside the name', () => {
  it('reads as the name, however it is drawn', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Triperco' })).toBeInTheDocument()
  })

  it('sets the word in the display face', () => {
    const { container } = render(<Logo />)
    const word = container.querySelector('text')!
    expect(word.textContent).toBe('Triperc')
    expect(word.getAttribute('class')).toContain('font-display')
  })

  it('pins the word’s width so the o always lands where it belongs', () => {
    // Without this the pin drifts off the end of the word whenever the display face is slow.
    const { container } = render(<Logo />)
    expect(container.querySelector('text')).toHaveAttribute('textLength', '150')
  })

  it('ends the word with a pin rather than a letter', () => {
    const { container } = render(<Logo />)
    const pin = [...container.querySelectorAll('path')].find((p) => p.getAttribute('fill-rule'))
    expect(pin).toHaveAttribute('fill-rule', 'evenodd')
  })

  it('flies a path from the T to that pin', () => {
    const { container } = render(<Logo />)
    const trail = container.querySelector('path[stroke][fill="none"]')!
    // Starts at the T on the left and finishes beside the o on the right.
    expect(trail.getAttribute('d')).toMatch(/^M5 13/)
    expect(trail.getAttribute('d')).toMatch(/136\.5 7\.6$/)
  })

  it('falls back to the square mark for a favicon or a tight corner', () => {
    const { container } = render(<Logo showWordmark={false} />)
    expect(container.querySelector('text')).toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 32 32')
  })
})
