import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { HeroPrompt } from './HeroPrompt'

describe('HeroPrompt', () => {
  it('routes to /plan?q= with the typed prompt on submit', () => {
    push.mockClear()
    render(<HeroPrompt />)
    fireEvent.change(screen.getByPlaceholderText(/where to/i), {
      target: { value: 'A week in Japan' },
    })
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledWith(`/plan?q=${encodeURIComponent('A week in Japan')}`)
  })

  it('routes to bare /plan when the prompt is empty', () => {
    push.mockClear()
    render(<HeroPrompt />)
    fireEvent.submit(screen.getByRole('form'))
    expect(push).toHaveBeenCalledWith('/plan')
  })
})
