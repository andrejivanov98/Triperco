import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanMapToggle } from './PlanMapToggle'

describe('PlanMapToggle', () => {
  it('renders both segments and marks the active one', () => {
    render(<PlanMapToggle view="plan" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /itinerary/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /map/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange when the other segment is clicked', () => {
    const onChange = vi.fn()
    render(<PlanMapToggle view="plan" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /map/i }))
    expect(onChange).toHaveBeenCalledWith('map')
  })
})
