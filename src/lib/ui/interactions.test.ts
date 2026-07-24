import { describe, it, expect } from 'vitest'
import { getOptionSets, getForms } from './interactions'
import type { TriperUIMessage } from './messages'

describe('interaction helpers', () => {
  it('extracts option sets and forms from a message', () => {
    const msg: TriperUIMessage = {
      id: 'm', role: 'assistant',
      parts: [
        { type: 'text', text: 'How shall we start?' },
        { type: 'data-options', data: { question: 'Start with', options: [{ label: 'Find a hotel', prompt: 'Find me a hotel' }] } },
        { type: 'data-form', data: { question: 'Interests?', mode: 'multi', options: ['Beaches', 'Hikes'] } },
      ],
    }
    expect(getOptionSets(msg)[0].options[0].label).toBe('Find a hotel')
    expect(getForms(msg)[0].mode).toBe('multi')
  })

  it('returns [] when absent', () => {
    const msg: TriperUIMessage = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] }
    expect(getOptionSets(msg)).toEqual([])
    expect(getForms(msg)).toEqual([])
  })
})
