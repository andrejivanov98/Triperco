import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './systemPrompt'

describe('buildSystemPrompt', () => {
  it('sets the concierge persona and key guardrails', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('Triperco')
    expect(p.toLowerCase()).toContain('concierge')
    expect(p.toLowerCase()).toContain('never invent')
    expect(p.toLowerCase()).toContain('cons')
    expect(p).toContain('presentOptions')
    expect(p).toContain('askPreferences')
    expect(p.toLowerCase()).toContain('title')
    expect(p.toLowerCase()).toContain('conflict')
  })

  it('forbids markdown and data-in-prose, so the cards carry the detail', () => {
    const p = buildSystemPrompt().toLowerCase()
    expect(p).toContain('never use markdown')
    expect(p).toContain('cards')
  })

  it('pushes the agent to assume defaults instead of interrogating', () => {
    const p = buildSystemPrompt().toLowerCase()
    expect(p).toContain('one question per turn')
    expect(p).toContain('never ask permission to search')
  })

  it('tells the agent to cover the whole trip, food included', () => {
    const p = buildSystemPrompt().toLowerCase()
    expect(p).toContain('where to eat')
    expect(p).toContain('getstaydetails')
  })
})
