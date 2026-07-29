import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './systemPrompt'
import { buildContextHints } from '../ui/contextHints'
import type { Stay } from '../trip/types'

const AT = '2026-07-28T10:00:00.000Z'

function stay(id: string, over: Partial<Stay> = {}): Stay {
  return {
    id,
    name: `Stay ${id}`,
    source: 'hotel',
    pricePerNight: 120,
    nights: 3,
    photos: [],
    bookUrl: 'https://book/' + id,
    ...over,
  }
}

describe('buildSystemPrompt — screen snapshot', () => {
  it('says nothing about the screen when nothing is on it', () => {
    const prompt = buildSystemPrompt(new Date('2026-07-28T00:00:00Z'))
    expect(prompt).not.toMatch(/LOOKING AT RIGHT NOW/)
  })

  it('appends what the traveler can see, with the ordinal they would use', () => {
    const hints = buildContextHints({
      sets: [{ kind: 'stays', items: [stay('a', { name: 'Hotel Vander' }), stay('b')] }],
      capturedAt: AT,
    })
    const prompt = buildSystemPrompt(new Date('2026-07-28T00:00:00Z'), hints)

    expect(prompt).toMatch(/WHAT THE TRAVELER IS LOOKING AT RIGHT NOW/)
    expect(prompt).toContain('Hotel Vander')
    expect(prompt).toContain('"position":1')
  })

  it('keeps the standing rules ahead of the snapshot', () => {
    const hints = buildContextHints({ sets: [{ kind: 'stays', items: [stay('a')] }], capturedAt: AT })
    const prompt = buildSystemPrompt(new Date('2026-07-28T00:00:00Z'), hints)
    expect(prompt.indexOf('YOU NEVER PUT ANYTHING IN THE PLAN')).toBeLessThan(
      prompt.indexOf('WHAT THE TRAVELER IS LOOKING AT RIGHT NOW'),
    )
  })

  it('tells the agent not to re-search for what is already on screen', () => {
    const hints = buildContextHints({ sets: [{ kind: 'stays', items: [stay('a')] }], capturedAt: AT })
    const prompt = buildSystemPrompt(new Date('2026-07-28T00:00:00Z'), hints).toLowerCase()
    expect(prompt).toContain('do not search again just to find out what is on screen')
  })

  it('marks the captured prices as not current', () => {
    const hints = buildContextHints({ sets: [{ kind: 'stays', items: [stay('a')] }], capturedAt: AT })
    const prompt = buildSystemPrompt(new Date('2026-07-28T00:00:00Z'), hints)
    expect(prompt).toMatch(/snapshot of the UI taken at capturedAt/)
    expect(prompt).toContain(AT)
  })
})
