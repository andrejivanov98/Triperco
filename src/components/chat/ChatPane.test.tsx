import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatPane } from './ChatPane'
import type { TriperUIMessage } from '@/lib/ui/messages'

const messages: TriperUIMessage[] = [
  { id: 'a', role: 'user', parts: [{ type: 'text', text: 'Rome for 4 days' }] },
  { id: 'b', role: 'assistant', parts: [{ type: 'text', text: 'Great choice!' }] },
]

describe('ChatPane', () => {
  it('renders the conversation', () => {
    render(
      <ChatPane messages={messages} status="ready" suggestions={['More food']} onSend={() => {}} />,
    )
    expect(screen.getByText('Rome for 4 days')).toBeInTheDocument()
    expect(screen.getByText('Great choice!')).toBeInTheDocument()
  })

  it('puts no suggestion chips above the composer', () => {
    // Suggestions belong in the thread as guided cards; two competing sets only added noise.
    render(
      <ChatPane messages={messages} status="ready" suggestions={['More food']} onSend={() => {}} />,
    )
    expect(screen.queryByText('More food')).not.toBeInTheDocument()
  })

  it('calls onSend with the typed text on submit', () => {
    const onSend = vi.fn()
    render(<ChatPane messages={[]} status="ready" suggestions={[]} onSend={onSend} />)
    fireEvent.change(screen.getByPlaceholderText(/tell triperco/i), { target: { value: 'Plan Rome' } })
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
    expect(screen.getByText(/1 places to stay/i)).toBeInTheDocument()
  })

  it('anchors each set of results so the navigator can jump to it', () => {
    const msgs: TriperUIMessage[] = [
      {
        id: 'm9',
        role: 'assistant',
        parts: [
          {
            type: 'data-results',
            data: {
              kind: 'stays',
              query: 'Rome',
              items: [
                {
                  id: 'a',
                  name: 'Hotel A',
                  source: 'hotel',
                  pricePerNight: 100,
                  nights: 2,
                  photos: [],
                  bookUrl: 'x',
                },
              ],
            },
          },
        ],
      },
    ]
    const { container } = render(
      <ChatPane messages={msgs} status="ready" suggestions={[]} onSend={() => {}} />,
    )
    expect(container.querySelector('#m9\\:0')).not.toBeNull()
  })

  it('shows a thinking indicator while a turn is in flight', () => {
    render(<ChatPane messages={messages} status="streaming" suggestions={[]} onSend={() => {}} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows no indicator once the turn is done', () => {
    render(<ChatPane messages={messages} status="ready" suggestions={[]} onSend={() => {}} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders assistant markdown as clean text', () => {
    const msgs: TriperUIMessage[] = [
      { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'I picked **Hotel One** for you.' }] },
    ]
    const { container } = render(
      <ChatPane messages={msgs} status="ready" suggestions={[]} onSend={() => {}} />,
    )
    expect(container.textContent).toContain('I picked Hotel One for you.')
    expect(container.textContent).not.toContain('**')
  })

  it('renders the empty state only when there are no messages', () => {
    const { rerender } = render(
      <ChatPane
        messages={[]}
        status="ready"
        suggestions={[]}
        onSend={() => {}}
        emptyState={<p>Where to?</p>}
      />,
    )
    expect(screen.getByText('Where to?')).toBeInTheDocument()
    rerender(
      <ChatPane
        messages={messages}
        status="ready"
        suggestions={[]}
        onSend={() => {}}
        emptyState={<p>Where to?</p>}
      />,
    )
    expect(screen.queryByText('Where to?')).not.toBeInTheDocument()
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
