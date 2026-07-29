import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageText } from './MessageText'

describe('MessageText', () => {
  it('renders emphasis as styled text, never as asterisks', () => {
    const { container } = render(<MessageText text="I found **Hotel Artemide** nearby." />)
    expect(container.textContent).toBe('I found Hotel Artemide nearby.')
    expect(container.textContent).not.toContain('*')
    expect(screen.getByText('Hotel Artemide').tagName).toBe('STRONG')
  })

  it('renders a dash list as a real list', () => {
    render(<MessageText text={'Next up:\n- Flights\n- A stay'} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual(['Flights', 'A stay'])
  })

  it('renders nothing for empty text', () => {
    const { container } = render(<MessageText text="   " />)
    expect(container.firstChild).toBeNull()
  })
})
