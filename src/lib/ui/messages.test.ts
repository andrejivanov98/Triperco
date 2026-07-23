import { describe, it, expect } from 'vitest'
import { getLatestTrip } from './messages'
import type { TriperUIMessage } from './messages'
import { createTrip, setMeta } from '../trip/tripState'

describe('getLatestTrip', () => {
  it('returns the trip from the most recent data-trip part', () => {
    const older = setMeta(createTrip('t1'), { destination: 'Paris' })
    const newer = setMeta(createTrip('t1'), { destination: 'Rome' })
    const messages: TriperUIMessage[] = [
      { id: 'a', role: 'assistant', parts: [{ type: 'data-trip', data: older }] },
      { id: 'b', role: 'user', parts: [{ type: 'text', text: 'change to Rome' }] },
      { id: 'c', role: 'assistant', parts: [{ type: 'text', text: 'Done.' }, { type: 'data-trip', data: newer }] },
    ]
    expect(getLatestTrip(messages)?.meta.destination).toBe('Rome')
  })

  it('returns null when there is no trip part', () => {
    const messages: TriperUIMessage[] = [
      { id: 'a', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ]
    expect(getLatestTrip(messages)).toBeNull()
  })
})
