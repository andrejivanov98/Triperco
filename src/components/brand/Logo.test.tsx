import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo, LogoMark } from './Logo'

describe('LogoMark', () => {
  it('is a single shape, so there is nothing to come apart', () => {
    // A pin with a plane cut out of it — not a pin with a plane sitting on top of it.
    const { container } = render(<LogoMark />)
    expect(container.querySelectorAll('path')).toHaveLength(1)
  })

  it('cuts the plane out rather than covering it with a second colour', () => {
    const { container } = render(<LogoMark />)
    const path = container.querySelector('path')!
    expect(path).toHaveAttribute('fill-rule', 'evenodd')
    // Three subpaths: the pin, the plane cut out of it, and the fold cut back in.
    expect((path.getAttribute('d')!.match(/[Mm]/g) ?? []).length).toBe(3)
  })

  it('is one colour, taken from the surrounding text', () => {
    const { container } = render(<LogoMark />)
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor')
    expect(container.innerHTML).not.toMatch(/gradient|#[0-9a-f]{3,6}|fill-opacity|stroke=/i)
  })

  it('carries no stroke, so it never thins out when scaled down', () => {
    const { container } = render(<LogoMark />)
    expect(container.querySelector('[stroke-width]')).toBeNull()
  })

  it('scales from a favicon to a billboard', () => {
    const { container } = render(<LogoMark className="h-40 w-40" />)
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 32 32')
  })

  it('is decorative, because the name beside it carries the meaning', () => {
    const { container } = render(<LogoMark />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Logo', () => {
  it('sets the name lowercase, in the brand face', () => {
    render(<Logo />)
    const word = screen.getByText('triperco')
    expect(word.className).toContain('font-brand')
    expect(word.className).toContain('font-extrabold')
  })

  it('keeps the mark and the name as separate things', () => {
    const { container } = render(<Logo />)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('triperco').closest('svg')).toBeNull()
  })

  it('can be the mark alone', () => {
    render(<Logo showWordmark={false} />)
    expect(screen.queryByText('triperco')).not.toBeInTheDocument()
  })
})
