import { describe, it, expect } from 'vitest'
import { getLatestMeta } from './messages'
import type { TriperUIMessage } from './messages'
import type { TripMeta } from '../trip/types'

describe('getLatestMeta', () => {
  it('returns the context from the most recent data-meta part', () => {
    const older: TripMeta = { travelers: 1, destination: 'Paris' }
    const newer: TripMeta = { travelers: 2, destination: 'Rome' }
    const messages: TriperUIMessage[] = [
      { id: 'a', role: 'assistant', parts: [{ type: 'data-meta', data: older }] },
      { id: 'b', role: 'user', parts: [{ type: 'text', text: 'change to Rome' }] },
      {
        id: 'c',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Done.' }, { type: 'data-meta', data: newer }],
      },
    ]
    expect(getLatestMeta(messages)?.destination).toBe('Rome')
  })

  it('returns null when no message carries context', () => {
    const messages: TriperUIMessage[] = [
      { id: 'a', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ]
    expect(getLatestMeta(messages)).toBeNull()
  })
})
