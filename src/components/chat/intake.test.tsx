import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DetailForm } from './DetailForm'
import { PrefForm } from './PrefForm'
import { ChatPane } from './ChatPane'
import { INTEREST_LABELS } from '@/lib/trip/intake'
import { SKIP_TEXT } from '@/lib/ui/intakeAnswers'
import type { TriperUIMessage } from '@/lib/ui/messages'

/**
 * The brief, as the traveler actually meets it.
 *
 * Asking "when were you thinking of going?" in a chat bubble makes somebody compose a sentence to
 * answer what a calendar answers better — and somebody who has not decided yet has nothing to type at
 * all. These cover the two cards the brief added, and the wiring that lets the trip record an answer
 * without waiting for the model to.
 */

describe('the destination card', () => {
  const request = { field: 'destination' as const, question: 'Where are you thinking of going?' }

  it('asks the question and takes a typed answer', () => {
    const onSubmit = vi.fn()
    render(<DetailForm request={request} onSubmit={onSubmit} onSkip={() => {}} />)
    expect(screen.getByText('Where are you thinking of going?')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/a city, a country/i), { target: { value: 'Barcelona' } })
    fireEvent.click(screen.getByRole('button', { name: /send this answer/i }))
    expect(onSubmit).toHaveBeenCalledWith('Barcelona')
  })

  /*
   * A traveler who knows where they are going types it. One who does not is staring at a blank field,
   * and "somewhere warm" is a real answer this app can act on — so it is offered as a row rather than
   * left as something they have to think of themselves.
   */
  it('offers a way out of the blank page', () => {
    const onSubmit = vi.fn()
    render(<DetailForm request={request} onSubmit={onSubmit} onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Somewhere warm' }))
    expect(onSubmit).toHaveBeenCalledWith('Somewhere warm')
  })

  /** Openings, not destinations: naming four cities would make the other two hundred feel wrong. */
  it('offers shapes of trip rather than a shortlist of cities', () => {
    render(<DetailForm request={request} onSubmit={() => {}} onSkip={() => {}} />)
    expect(screen.queryByRole('button', { name: /^Rome$/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Surprise me' })).toBeInTheDocument()
  })
})

/**
 * A multi-select used to lose its Skip to the Next button, leaving somebody who did not want to pick
 * anything with only Dismiss — and dismissing answers nothing, so the same form came back next turn.
 */
describe('skipping the interests form', () => {
  const form = {
    question: 'What do you want Barcelona to be about?',
    mode: 'multi' as const,
    options: INTEREST_LABELS,
    intent: 'interests' as const,
  }

  it('offers both a way to answer and a way past', () => {
    render(<PrefForm form={form} onSubmit={() => {}} onSkip={() => {}} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
  })

  it('reports a skip as a skip', () => {
    const onSkip = vi.fn()
    render(<PrefForm form={form} onSubmit={() => {}} onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalled()
  })
})

/**
 * The card knows which question it asked; prose does not. Reporting that lets the trip record the
 * answer itself — so a model that forgets to call `setTripMeta` cannot bring the same calendar back.
 */
describe('ChatPane — reporting what a guided card answered', () => {
  function withPart(part: TriperUIMessage['parts'][number]): TriperUIMessage[] {
    return [{ id: 'a1', role: 'assistant', parts: [part] } as TriperUIMessage]
  }

  it('names the field a detail card answered, and still sends the message', () => {
    const onIntakeAnswer = vi.fn()
    const onSend = vi.fn()
    render(
      <ChatPane
        messages={withPart({
          type: 'data-detail',
          data: { field: 'destination', question: 'Where to?' },
        })}
        status="ready"
        onSend={onSend}
        onIntakeAnswer={onIntakeAnswer}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Somewhere warm' }))
    expect(onIntakeAnswer).toHaveBeenCalledWith({
      kind: 'detail',
      field: 'destination',
      text: 'Somewhere warm',
    })
    // Both halves: the transcript has to stay readable, so the message goes too.
    expect(onSend).toHaveBeenCalledWith('Somewhere warm')
  })

  it('carries the form’s own intent, so the answer can be applied', () => {
    const onIntakeAnswer = vi.fn()
    render(
      <ChatPane
        messages={withPart({
          type: 'data-form',
          data: {
            question: 'What is it for?',
            mode: 'multi',
            options: ['Food and restaurants', 'Nightlife'],
            intent: 'interests',
          },
        })}
        status="ready"
        onSend={() => {}}
        onIntakeAnswer={onIntakeAnswer}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Nightlife' }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onIntakeAnswer).toHaveBeenCalledWith({
      kind: 'form',
      intent: 'interests',
      text: 'Nightlife',
    })
  })

  it('reports a skip too, because declining is an answer', () => {
    const onIntakeAnswer = vi.fn()
    render(
      <ChatPane
        messages={withPart({
          type: 'data-form',
          data: { question: 'What is it for?', mode: 'multi', options: ['Nightlife'], intent: 'interests' },
        })}
        status="ready"
        onSend={() => {}}
        onIntakeAnswer={onIntakeAnswer}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onIntakeAnswer).toHaveBeenCalledWith({
      kind: 'form',
      intent: 'interests',
      text: SKIP_TEXT,
    })
  })
})
