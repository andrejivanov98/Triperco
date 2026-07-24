import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExperienceCard } from './ExperienceCard'
import type { Experience } from '@/lib/landing/content'

const exp: Experience = {
  id: 'safari', title: 'Go on safari', blurb: 'Dawn game drives.',
  image: 'https://images.unsplash.com/y?w=800', planPrompt: 'Plan a 6-day safari.',
}

describe('ExperienceCard', () => {
  it('shows title and links to /plan with the prompt', () => {
    render(<ExperienceCard experience={exp} />)
    expect(screen.getByText('Go on safari')).toBeInTheDocument()
    expect(screen.getByRole('link').getAttribute('href')).toContain('/plan?q=')
  })
})
