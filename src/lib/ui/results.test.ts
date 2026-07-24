import { describe, it, expect } from 'vitest'
import { getResultSets } from './results'
import type { TriperUIMessage } from './messages'

describe('getResultSets', () => {
  it('collects data-results parts from a message in order', () => {
    const msg: TriperUIMessage = {
      id: 'm', role: 'assistant',
      parts: [
        { type: 'text', text: 'Here are some stays.' },
        { type: 'data-results', data: { kind: 'stays', query: 'Rome', items: [] } },
        { type: 'data-results', data: { kind: 'flights', query: 'SKP → FCO', items: [] } },
      ],
    }
    const sets = getResultSets(msg)
    expect(sets.map((s) => s.kind)).toEqual(['stays', 'flights'])
  })

  it('returns [] when there are no result parts', () => {
    const msg: TriperUIMessage = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] }
    expect(getResultSets(msg)).toEqual([])
  })
})
