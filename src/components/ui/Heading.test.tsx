import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Heading } from './Heading'

describe('Heading', () => {
  it('renders the given level and text as a serif display heading', () => {
    render(<Heading level={2}>Featured destinations</Heading>)
    const h = screen.getByRole('heading', { level: 2, name: 'Featured destinations' })
    expect(h.className).toContain('font-display')
  })

  it('merges extra className', () => {
    render(
      <Heading level={1} className="text-4xl">
        Hi
      </Heading>,
    )
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('text-4xl')
  })
})
