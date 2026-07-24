import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionRow } from './SectionRow'

describe('SectionRow', () => {
  it('renders a heading and its children', () => {
    render(
      <SectionRow title="Places we love">
        <div>child A</div>
        <div>child B</div>
      </SectionRow>,
    )
    expect(screen.getByRole('heading', { name: 'Places we love' })).toBeInTheDocument()
    expect(screen.getByText('child A')).toBeInTheDocument()
    expect(screen.getByText('child B')).toBeInTheDocument()
  })
})
