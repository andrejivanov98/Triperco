import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PrefForm } from './PrefForm'
import type { PrefForm as PrefFormData } from '@/lib/ui/interactions'

const multi: PrefFormData = { question: 'What do you enjoy?', mode: 'multi', options: ['Beaches', 'Hikes', 'Food'] }
const single: PrefFormData = { question: 'What pace?', mode: 'single', options: ['Relaxed', 'Packed'] }

describe('PrefForm', () => {
  it('multi: checks options and submits the joined selection via Next', () => {
    const onSubmit = vi.fn()
    render(<PrefForm form={multi} onSubmit={onSubmit} onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Beaches' }))
    fireEvent.click(screen.getByRole('button', { name: 'Food' }))
    expect(screen.getByRole('button', { name: 'Beaches' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSubmit).toHaveBeenCalledWith('Beaches, Food')
  })

  it('lets the traveler answer in their own words instead', () => {
    const onSubmit = vi.fn()
    render(<PrefForm form={multi} onSubmit={onSubmit} onSkip={() => {}} />)
    fireEvent.change(screen.getByLabelText(/write something else/i), {
      target: { value: 'Anything with a view' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send this answer/i }))
    expect(onSubmit).toHaveBeenCalledWith('Anything with a view')
  })

  it('can be dismissed outright', () => {
    render(<PrefForm form={multi} onSubmit={() => {}} onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByTestId('guided-card')).not.toBeInTheDocument()
  })

  it('single: submits immediately on choice', () => {
    const onSubmit = vi.fn()
    render(<PrefForm form={single} onSubmit={onSubmit} onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Relaxed' }))
    expect(onSubmit).toHaveBeenCalledWith('Relaxed')
  })

  it('fires onSkip', () => {
    const onSkip = vi.fn()
    render(<PrefForm form={single} onSubmit={() => {}} onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalled()
  })
})
