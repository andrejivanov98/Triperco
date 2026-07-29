import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Icon } from './Icon'

describe('Icon', () => {
  it('draws a stroked vector rather than somebody else’s emoji artwork', () => {
    const { container } = render(<Icon name="plane" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
  })

  it('takes its colour and size from the surrounding text', () => {
    const { container } = render(<Icon name="bed" className="h-6 w-6 text-accent" />)
    expect(container.querySelector('svg')).toHaveClass('h-6', 'w-6', 'text-accent')
  })

  it('is hidden from screen readers, because the label sits next to it', () => {
    const { container } = render(<Icon name="ticket" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
