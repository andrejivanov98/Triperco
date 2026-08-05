import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo, LogoMark, LOGO_PATH } from './Logo'

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

/**
 * The nose is the one part of this shape that has to stay sharp. The fold used to run all the way up
 * to the dart's tip and cut a notch out of it, so the plane read as blunt at every size.
 */
describe('LogoMark — the fold stops short of the nose', () => {
  /** Every "x y" pair in the path, as numbers. */
  function points(d: string): { x: number; y: number }[] {
    return [...d.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
    }))
  }

  /** The three subpaths, in the order they are drawn: pin, plane, fold. */
  function subpaths(d: string): string[] {
    return d.split(/(?=M)/).filter((s) => s.trim().length > 0)
  }

  it('still draws all three subpaths', () => {
    expect(subpaths(LOGO_PATH)).toHaveLength(3)
  })

  it('keeps the fold clear of the dart tip', () => {
    const [, plane, fold] = subpaths(LOGO_PATH)
    const tip = points(plane)[0]
    const foldStart = points(fold)[0]
    const gap = Math.hypot(tip.x - foldStart.x, tip.y - foldStart.y)
    // On a 32-unit grid, under ~2 units read as touching the tip and notched it.
    expect(gap).toBeGreaterThan(2)
  })

  it('starts the fold below the tip, never above it', () => {
    const [, plane, fold] = subpaths(LOGO_PATH)
    expect(points(fold)[0].y).toBeGreaterThan(points(plane)[0].y)
  })

  it('leaves the pin and the plane themselves untouched', () => {
    const [pin, plane] = subpaths(LOGO_PATH)
    expect(pin).toContain('M16 2C10.2 2 5.5 6.7 5.5 12.5')
    expect(plane).toContain('M23.6 9.3 8.1 14')
  })
})
