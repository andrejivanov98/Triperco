import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import type { ResultSet } from '@/lib/ui/results'
import type { ContextHint } from '@/lib/ui/contextHints'
import type { Stay } from '@/lib/trip/types'

/** Whatever the screen handed to the transport, so we can inspect the outgoing request. */
let transportOptions: {
  prepareSendMessagesRequest?: (arg: { messages: unknown[] }) => { body: Record<string, unknown> }
} = {}

vi.mock('ai', () => ({
  DefaultChatTransport: class {
    constructor(options: Record<string, unknown>) {
      transportOptions = options
    }
  },
}))
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: [], sendMessage: vi.fn(), setMessages: vi.fn(), status: 'ready' }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { PlannerScreen } from './PlannerScreen'

function stay(id: string, over: Partial<Stay> = {}): Stay {
  return {
    id,
    name: `Stay ${id}`,
    source: 'hotel',
    pricePerNight: 100,
    nights: 2,
    photos: [],
    bookUrl: 'https://book/' + id,
    ...over,
  }
}

/** A thread where the assistant has already shown a set of stays. */
function threadWithStays() {
  const set: ResultSet = { kind: 'stays', query: 'Ljubljana', items: [stay('a'), stay('b')] }
  return [
    { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'somewhere to stay' }] },
    { id: 'm2', role: 'assistant', parts: [{ type: 'data-results', data: set }] },
  ]
}

function sentBody(messages: unknown[]): Record<string, unknown> {
  const prepare = transportOptions.prepareSendMessagesRequest
  if (!prepare) throw new Error('PlannerScreen did not configure prepareSendMessagesRequest')
  return prepare({ messages }).body
}

describe('PlannerScreen — screen snapshot sent with each message', () => {
  beforeEach(() => {
    transportOptions = {}
  })

  it('sends no hints when nothing has been shown yet', () => {
    render(<PlannerScreen />)
    expect(sentBody([])).toMatchObject({ hints: [] })
  })

  it('sends the visible stays alongside the message', () => {
    render(<PlannerScreen />)
    const hints = sentBody(threadWithStays()).hints as ContextHint[]

    expect(hints).toHaveLength(1)
    expect(hints[0].hintType).toBe('stay_results')
    expect(hints[0].capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const parsed = JSON.parse(hints[0].content) as { items: { id: string; position: number }[] }
    expect(parsed.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(parsed.items[0].position).toBe(1)
  })

  it('still sends the trip so the agent knows the context it recorded', () => {
    render(<PlannerScreen />)
    const body = sentBody(threadWithStays())
    expect(body).toHaveProperty('trip')
    expect(body).toHaveProperty('messages')
  })
})
