import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DestinationCard } from './DestinationCard'
import type { Destination } from '@/lib/landing/content'

const dest: Destination = {
  id: 'rome', title: 'Rome', country: 'Italy',
  blurb: 'Ancient wonders.', image: 'https://images.unsplash.com/x?w=800',
  planPrompt: 'Plan a 4-day trip to Rome.',
}

describe('DestinationCard', () => {
  it('shows title + country and links to /plan with the prompt', () => {
    render(<DestinationCard destination={dest} />)
    expect(screen.getByText('Rome')).toBeInTheDocument()
    expect(screen.getByText('Italy')).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toContain('/plan?q=')
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain('Plan a 4-day trip to Rome.')
  })
})
