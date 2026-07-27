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

  it("states today's date so the agent never searches the past", () => {
    const p = buildSystemPrompt(new Date('2026-07-27T10:00:00Z'))
    expect(p).toContain('TODAY IS 2026-07-27')
    expect(p).toContain('2027-07-27') // the window for a bare month name
    expect(p.toLowerCase()).toContain('reject past dates')
  })

  it('reminds the agent that round trips need a return date', () => {
    expect(buildSystemPrompt()).toContain('return_date')
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
