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

  it('forbids the agent from putting anything in the plan', () => {
    const p = buildSystemPrompt().toLowerCase()
    expect(p).toContain('you never put anything in the plan')
    expect(p).toContain('never claim you added')
    expect(p).toContain('add to trip')
  })

  it('bans narration so the chat shows results, not intentions', () => {
    const p = buildSystemPrompt().toLowerCase()
    expect(p).toContain('do not narrate')
    expect(p).toContain('one short sentence')
    expect(p).toContain('never explain your reasoning')
  })

  it('makes it work one step at a time instead of dumping the whole trip', () => {
    const p = buildSystemPrompt().toLowerCase()
    expect(p).toContain('one step at a time')
    expect(p).toContain('never search flights, stays and places in the same turn')
  })

  it('makes it ask which flight shape they want rather than deciding', () => {
    const p = buildSystemPrompt().toLowerCase()
    expect(p).toContain('do not decide between a round trip and two one-ways')
  })

  it('insists on a real trip name, never a generic one', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('Torino Getaway')
    expect(p.toLowerCase()).toContain('never a')
  })

  it('still tells the agent to ground its recommendations in real detail', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain('getstaydetails')
  })
})

describe('buildSystemPrompt — later refinements', () => {
  it('forbids inventing a budget', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain('never invent a budget')
  })

  it('requires conversation-specific follow-ups every turn', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('suggestReplies')
    expect(p.toLowerCase()).toContain('not a generic menu')
  })

  it('tells the agent not to fill in days on the traveler behalf', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain('do not assign things to specific days')
  })

  it('bans closed-down recommendations', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain('closed down')
  })
})

describe('buildSystemPrompt — reading the traveler', () => {
  it('tells the agent to record pace and vibe', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('READ THE ROOM')
    expect(p).toContain('pace, vibe')
  })

  it('names all three paces and what each one changes', () => {
    const p = buildSystemPrompt()
    for (const pace of ['"fast"', '"explore"', '"detailed"']) expect(p).toContain(pace)
  })

  it('tells the agent to match the mood rather than argue with it', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain(
      'never argue with how they feel about their own trip',
    )
  })
})

/**
 * The prompt used to say both "open every new trip with presentOptions, then stop and wait" and
 * "never ask permission to search". Those cannot both be followed, and which one won was luck.
 */
describe('buildSystemPrompt — no contradiction about when to search', () => {
  it('no longer tells the agent to open every trip with a menu', () => {
    expect(buildSystemPrompt().toLowerCase()).not.toContain('open every new trip with presentoptions')
  })

  it('makes the fork depend on whether a task was named', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('DID THEY SAY WHAT THEY WANT? THEN DO IT')
    expect(p.toLowerCase()).toContain('never ask permission')
  })

  it('keeps presentOptions for the case where the path really does fork', () => {
    expect(buildSystemPrompt()).toContain('presentOptions')
  })
})

describe('buildSystemPrompt — controls over prose', () => {
  it('requires askTripDetail for dates, party, budget and origin', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('askTripDetail')
    expect(p.toLowerCase()).toContain('never ask for those four in prose')
  })

  it('forbids code and payloads outright', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain('never write code, json, a payload')
  })
})

describe('buildSystemPrompt — closing the loop', () => {
  it('tells the agent to offer what the plan is still missing', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('CLOSE THE LOOP')
    expect(p.toLowerCase()).toContain('never re-offer something the plan already has')
  })

  it('names the three things a trip needs', () => {
    const p = buildSystemPrompt().toLowerCase()
    expect(p).toContain('transport, somewhere to stay, things to do')
  })
})

describe('buildSystemPrompt — getting around', () => {
  it('asks for the whole connection, not just the airport run', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('GIVE THEM THE WHOLE CONNECTION')
    expect(p).toContain('getTransferOptions')
  })

  it('still forbids guessing a duration', () => {
    expect(buildSystemPrompt()).toContain('NEVER guess a duration')
  })
})
