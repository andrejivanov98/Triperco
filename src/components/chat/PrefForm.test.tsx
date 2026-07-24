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
    fireEvent.click(screen.getByLabelText('Beaches'))
    fireEvent.click(screen.getByLabelText('Food'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSubmit).toHaveBeenCalledWith('Beaches, Food')
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
