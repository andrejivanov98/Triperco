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
    // Suggestions belong in the thread, attached to the turn they answer — never in the composer,
    // where they competed with the input for the same job.
    render(
      <ChatPane messages={messages} status="ready" suggestions={['More food']} onSend={() => {}} />,
    )
    expect(screen.getByRole('form')).not.toContainElement(
      screen.getByRole('button', { name: 'More food' }),
    )
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

/**
 * The agent is told to end every turn with somewhere to go. Before this, it did — and the parts it
 * wrote were silently dropped, so the traveler never saw one.
 */
describe('ChatPane — next moves', () => {
  const withSuggestions: TriperUIMessage[] = [
    { id: 'a', role: 'user', parts: [{ type: 'text', text: 'Find stays in Rome' }] },
    {
      id: 'b',
      role: 'assistant',
      parts: [
        { type: 'text', text: '14 stays in Trastevere.' },
        { type: 'data-suggestions', data: { replies: ['Somewhere quieter', 'Only with a kitchen'] } },
      ],
    },
  ]

  it("renders the agent's own suggestions for the turn", () => {
    render(<ChatPane messages={withSuggestions} status="ready" onSend={() => {}} />)
    expect(screen.getByRole('button', { name: 'Somewhere quieter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Only with a kitchen' })).toBeInTheDocument()
  })

  it('sends a chip as the traveler’s own message', () => {
    const onSend = vi.fn()
    render(<ChatPane messages={withSuggestions} status="ready" onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: 'Somewhere quieter' }))
    expect(onSend).toHaveBeenCalledWith('Somewhere quieter')
  })

  it("prefers the agent's suggestions over the trip-derived fallback", () => {
    render(
      <ChatPane messages={withSuggestions} status="ready" suggestions={['Make it cheaper']} onSend={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Somewhere quieter' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Make it cheaper' })).not.toBeInTheDocument()
  })

  it('falls back to the trip-derived replies when the agent proposed none', () => {
    render(<ChatPane messages={messages} status="ready" suggestions={['Make it cheaper']} onSend={() => {}} />)
    expect(screen.getByRole('button', { name: 'Make it cheaper' })).toBeInTheDocument()
  })

  it('offers nothing while the turn is still streaming', () => {
    render(<ChatPane messages={withSuggestions} status="streaming" onSend={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Somewhere quieter' })).not.toBeInTheDocument()
  })

  it('offers nothing on an older turn, only the newest', () => {
    const older: TriperUIMessage[] = [
      ...withSuggestions,
      { id: 'c', role: 'user', parts: [{ type: 'text', text: 'and flights?' }] },
      { id: 'd', role: 'assistant', parts: [{ type: 'text', text: '12 one-ways.' }] },
    ]
    render(<ChatPane messages={older} status="ready" onSend={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Somewhere quieter' })).not.toBeInTheDocument()
  })

  it('stays quiet beside a guided card, which already asks its own question', () => {
    const msgs: TriperUIMessage[] = [
      {
        id: 'o',
        role: 'assistant',
        parts: [
          { type: 'data-options', data: { options: [{ label: 'Find a hotel', prompt: 'Find me a hotel' }] } },
          { type: 'data-suggestions', data: { replies: ['Somewhere quieter'] } },
        ],
      },
    ]
    render(<ChatPane messages={msgs} status="ready" onSend={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Somewhere quieter' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find a hotel' })).toBeInTheDocument()
  })
})

describe('ChatPane — guided detail requests', () => {
  it('renders a calendar when the agent asks for dates', () => {
    const msgs: TriperUIMessage[] = [
      {
        id: 'd',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Rome it is.' },
          { type: 'data-detail', data: { field: 'dates', question: 'When were you thinking?' } },
        ],
      },
    ]
    render(<ChatPane messages={msgs} status="ready" onSend={() => {}} />)
    expect(screen.getByText('When were you thinking?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pick dates/i })).toBeInTheDocument()
  })

  it('sends the answer as the traveler’s own message', () => {
    const onSend = vi.fn()
    const msgs: TriperUIMessage[] = [
      {
        id: 'd',
        role: 'assistant',
        parts: [{ type: 'data-detail', data: { field: 'party', question: 'Who is coming?' } }],
      },
    ]
    render(<ChatPane messages={msgs} status="ready" onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: /1 adult · 1 room/i }))
    expect(onSend).toHaveBeenCalledWith('1 adult · 1 room')
  })

  it('offers no competing chips beside the control', () => {
    const msgs: TriperUIMessage[] = [
      {
        id: 'd',
        role: 'assistant',
        parts: [
          { type: 'data-detail', data: { field: 'budget', question: 'What sort of budget?' } },
          { type: 'data-suggestions', data: { replies: ['Make it cheaper'] } },
        ],
      },
    ]
    render(<ChatPane messages={msgs} status="ready" onSend={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Make it cheaper' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mid-range is fine' })).toBeInTheDocument()
  })
})

describe('ChatPane — turn notices', () => {
  it('renders a recovered sentence as ordinary prose', () => {
    const msgs: TriperUIMessage[] = [
      {
        id: 'n',
        role: 'assistant',
        parts: [{ type: 'data-notice', data: { text: '14 stays in Trastevere.', kind: 'recovered' } }],
      },
    ]
    render(<ChatPane messages={msgs} status="ready" onSend={() => {}} />)
    expect(screen.getByText('14 stays in Trastevere.')).toBeInTheDocument()
    expect(screen.getByTestId('turn-notice')).toHaveAttribute('data-kind', 'recovered')
  })

  it('marks an outright failure, so it never reads as trip information', () => {
    const msgs: TriperUIMessage[] = [
      {
        id: 'n',
        role: 'assistant',
        parts: [{ type: 'data-notice', data: { text: "That didn't come through.", kind: 'failed' } }],
      },
    ]
    render(<ChatPane messages={msgs} status="ready" onSend={() => {}} />)
    expect(screen.getByTestId('turn-notice')).toHaveAttribute('data-kind', 'failed')
  })
})
