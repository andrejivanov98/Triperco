import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestionChips } from './SuggestionChips'

describe('SuggestionChips', () => {
  it('renders one chip per reply', () => {
    render(<SuggestionChips replies={['Only nonstop', 'Somewhere quieter']} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Only nonstop' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Somewhere quieter' })).toBeInTheDocument()
  })

  it('sends the chip text when tapped', () => {
    const onPick = vi.fn()
    render(<SuggestionChips replies={['Only nonstop']} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Only nonstop' }))
    expect(onPick).toHaveBeenCalledWith('Only nonstop')
  })

  it('renders nothing when there is nothing to offer', () => {
    const { container } = render(<SuggestionChips replies={[]} onPick={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
