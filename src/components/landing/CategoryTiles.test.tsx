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
})
