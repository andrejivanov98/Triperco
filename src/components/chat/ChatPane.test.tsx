import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatPane } from './ChatPane'
import type { TriperUIMessage } from '@/lib/ui/messages'

const messages: TriperUIMessage[] = [
  { id: 'a', role: 'user', parts: [{ type: 'text', text: 'Rome for 4 days' }] },
  { id: 'b', role: 'assistant', parts: [{ type: 'text', text: 'Great choice!' }] },
]

describe('ChatPane', () => {
  it('renders message text and suggestion chips', () => {
    render(
      <ChatPane messages={messages} status="ready" suggestions={['More food']} onSend={() => {}} />,
    )
    expect(screen.getByText('Rome for 4 days')).toBeInTheDocument()
    expect(screen.getByText('Great choice!')).toBeInTheDocument()
    expect(screen.getByText('More food')).toBeInTheDocument()
  })

  it('calls onSend when a chip is clicked', () => {
    const onSend = vi.fn()
    render(<ChatPane messages={[]} status="ready" suggestions={['Hidden gems']} onSend={onSend} />)
    fireEvent.click(screen.getByText('Hidden gems'))
    expect(onSend).toHaveBeenCalledWith('Hidden gems')
  })

  it('calls onSend with the typed text on submit', () => {
    const onSend = vi.fn()
    render(<ChatPane messages={[]} status="ready" suggestions={[]} onSend={onSend} />)
    fireEvent.change(screen.getByPlaceholderText(/ask anything/i), { target: { value: 'Plan Rome' } })
    fireEvent.submit(screen.getByRole('form'))
    expect(onSend).toHaveBeenCalledWith('Plan Rome')
  })

  it('renders a result carousel from a data-results part', () => {
    const withResults: TriperUIMessage[] = [
      {
        id: 'r', role: 'assistant',
        parts: [
          { type: 'text', text: 'Here are stays.' },
          { type: 'data-results', data: { kind: 'stays', query: 'Rome', items: [
            { id: 's1', name: 'Hotel One', source: 'hotel', pricePerNight: 90, nights: 3, photos: [], bookUrl: 'x' },
          ] } },
        ],
      },
    ]
    render(<ChatPane messages={withResults} status="ready" suggestions={[]} onSend={() => {}} />)
    expect(screen.getByText('Hotel One')).toBeInTheDocument()
    expect(screen.getByText(/1 stays/i)).toBeInTheDocument()
  })

  it('renders a guided option menu and sends the chosen prompt', () => {
    const onSend = vi.fn()
    const msgs: TriperUIMessage[] = [
      {
        id: 'o', role: 'assistant',
        parts: [
          { type: 'text', text: 'How shall we start?' },
          { type: 'data-options', data: { question: 'Start with', options: [{ label: 'Find a hotel', prompt: 'Find me a hotel' }] } },
        ],
      },
    ]
    render(<ChatPane messages={msgs} status="ready" suggestions={[]} onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: 'Find a hotel' }))
    expect(onSend).toHaveBeenCalledWith('Find me a hotel')
  })
})
