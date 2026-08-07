import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './systemPrompt'
import { planStage } from '@/lib/trip/stage'
import { createTrip, setMeta } from '@/lib/trip/tripState'

/** The trip from the reported bug: everything a flight search needs, in one typed sentence. */
function tenerife() {
  return setMeta(createTrip('t'), {
    destination: 'Tenerife',
    origin: 'SKP',
    startDate: '2027-03-19',
    endDate: '2027-03-28',
    travelers: 2,
    adults: 2,
  })
}

describe('buildSystemPrompt', () => {
  it('sets the concierge persona and key guardrails', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('Triperco')
    expect(p.toLowerCase()).toContain('concierge')
    expect(p.toLowerCase()).toContain('never invent')
    expect(p.toLowerCase()).toContain('cons')
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

  /*
   * The sentence the reported bug produced — "Alright, I'll look into flights from Skopje to
   * Tenerife" with no flights behind it — is now named as its own prohibition, rather than left to
   * be inferred from the general ban on narration.
   */
  it('forbids announcing an intention it does not carry out in the same turn', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain(
      'never announce an intention you are not carrying out in the same turn',
    )
  })

  it('still tells the agent to ground its recommendations in real detail', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain('getstaydetails')
  })

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

  it('still forbids guessing a duration', () => {
    expect(buildSystemPrompt()).toContain('NEVER guess a duration')
  })

  it('forbids code and payloads outright', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain('never write code, json, a payload')
  })
})

describe('buildSystemPrompt — reading the traveler', () => {
  it('tells the agent to record pace and vibe', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('READ THE ROOM')
    expect(p).toContain('pace, vibe')
  })

  it('names all three paces', () => {
    const p = buildSystemPrompt()
    for (const pace of ['"fast"', '"explore"', '"detailed"']) expect(p).toContain(pace)
  })

  it('tells the agent to match the mood rather than argue with it', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain(
      'never argue with how they feel about their own trip',
    )
  })

  it('tells it to record a part the traveler is handling themselves', () => {
    expect(buildSystemPrompt()).toContain('setTripMeta skipped')
  })
})

/**
 * Sequencing left this file entirely.
 *
 * It used to be spread across six shouted sections that gave different verdicts on the same input —
 * "search now", "offer a menu", "ask which flight shape", "ask for the origin" — and which one won
 * was luck. It now arrives as one stage block computed from the trip.
 */
describe('buildSystemPrompt — the prompt no longer sequences the trip', () => {
  it.each([
    ['one step at a time'],
    ['did they say what they want'],
    ['close the loop'],
    ['never re-offer something the plan already has'],
    ['do not decide between a round trip and two one-ways'],
    ['never ask for those four in prose'],
  ])('has dropped the rule about %s', (phrase) => {
    expect(buildSystemPrompt().toLowerCase()).not.toContain(phrase)
  })

  it('says nothing about which step to work on when given no stage', () => {
    expect(buildSystemPrompt()).not.toContain('THIS TURN')
  })
})

describe('buildSystemPrompt — the stage block', () => {
  it('names this turn as searching flights for a trip that needs nothing else', () => {
    const p = buildSystemPrompt(new Date(), [], planStage(tenerife()))
    expect(p).toContain('THIS TURN')
    expect(p).toContain('Search the flights to Tenerife now')
  })

  it('names this turn as settling the destination for an empty trip', () => {
    const p = buildSystemPrompt(new Date(), [], planStage(createTrip('t')))
    expect(p.toLowerCase()).toContain('do not know where they are going')
    expect(p).toContain('setTripMeta')
    expect(p.toLowerCase()).toContain('title')
  })

  it('lets the traveler outrank the stage, so an off-stage request is still answered', () => {
    const p = buildSystemPrompt(new Date(), [], planStage(tenerife())).toLowerCase()
    expect(p).toContain('if they asked for something else, do that instead')
  })

  it('puts the stage before the screen, so the job is read before the detail', () => {
    const stage = planStage(tenerife())
    const p = buildSystemPrompt(new Date(), [
      {
        hintType: 'plan',
        description: 'What they have so far.',
        content: '{}',
        capturedAt: '2027-01-01T00:00:00.000Z',
      },
    ], stage)
    expect(p.indexOf('THIS TURN')).toBeLessThan(p.indexOf('WHAT THE TRAVELER IS LOOKING AT'))
  })
})
