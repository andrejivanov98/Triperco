import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryTiles } from './CategoryTiles'

describe('CategoryTiles', () => {
  it('renders the four category shortcuts as links into /plan', () => {
    render(<CategoryTiles />)
    for (const label of ['Hotels & homes', 'Flights', 'Things to do', 'Destinations']) {
      const link = screen.getByRole('link', { name: new RegExp(label, 'i') })
      expect(link.getAttribute('href')).toMatch(/^\/plan\?q=/)
    }
  })

  it('describes what each category does', () => {
    render(<CategoryTiles />)
    expect(screen.getByText(/unbeatable prices/i)).toBeInTheDocument()
    expect(screen.getByText(/trade-offs spelled out/i)).toBeInTheDocument()
    expect(screen.getByText(/perfectly planned/i)).toBeInTheDocument()
    expect(screen.getByText(/describe a vibe/i)).toBeInTheDocument()
  })

  it('gives every card its own illustration', () => {
    const { container } = render(<CategoryTiles />)
    expect(container.querySelectorAll('svg')).toHaveLength(4)
  })
})
