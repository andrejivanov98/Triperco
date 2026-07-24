import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OptionList } from './OptionList'
import type { OptionSet } from '@/lib/ui/interactions'

const set: OptionSet = {
  question: 'What would you like to start with?',
  options: [
    { label: 'Find a hotel', prompt: 'Find me a hotel' },
    { label: 'Look up flights', prompt: 'Look up flights' },
  ],
}

describe('OptionList', () => {
  it('renders the question and options', () => {
    render(<OptionList set={set} onChoose={() => {}} />)
    expect(screen.getByText('What would you like to start with?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find a hotel' })).toBeInTheDocument()
  })

  it('sends the chosen option prompt', () => {
    const onChoose = vi.fn()
    render(<OptionList set={set} onChoose={onChoose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Look up flights' }))
    expect(onChoose).toHaveBeenCalledWith('Look up flights')
  })
})
