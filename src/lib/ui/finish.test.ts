import { describe, it, expect } from 'vitest'
import { isFinishRequest, planDoneOptions, FINISH_PROMPT, FINISH_LABEL } from './finish'

/**
 * Asking to stop is the one message the concierge never sees: the answer lives in the plan, so
 * sending it to a model could only produce a worse one. That makes a false positive expensive —
 * it silently swallows a turn the traveler wanted — and a miss cheap, because the button that sends
 * the exact phrase is on screen the whole time.
 */
describe('isFinishRequest', () => {
  it('recognises the button’s own words', () => {
    expect(isFinishRequest(FINISH_PROMPT)).toBe(true)
  })

  it('recognises the ways people actually say it', () => {
    for (const text of [
      'summarise my trip',
      'Summarize the trip',
      'show me the summary',
      'Give me my trip summary',
      "That's everything, thanks",
      'wrap it up',
      "I'm done planning",
      'finish planning please',
    ]) {
      expect(isFinishRequest(text), text).toBe(true)
    }
  })

  it('leaves an ordinary planning message alone', () => {
    for (const text of [
      'what else is worth doing?',
      'summarise what reviewers said about that hotel',
      'is everything booked?',
      'anything cheaper?',
      'Add a hidden gem in Rome I would not have found',
      'find me a flight home',
      '',
      '   ',
    ]) {
      expect(isFinishRequest(text), text).toBe(false)
    }
  })
})

describe('planDoneOptions', () => {
  it('offers ways to keep going and one way to stop', () => {
    const set = planDoneOptions('Rome')
    expect(set.options).toHaveLength(4)
    expect(set.options.at(-1)).toEqual({ label: FINISH_LABEL, prompt: FINISH_PROMPT })
  })

  it('names the destination in the suggestions that need one', () => {
    expect(planDoneOptions('Rome').options[2].prompt).toContain('Rome')
  })

  it('still reads properly with nowhere named', () => {
    expect(planDoneOptions().options[2].prompt).toContain('there')
  })

  /** Every option has to survive the round trip through the chat as a real message. */
  it('sends something the concierge can act on', () => {
    for (const option of planDoneOptions('Rome').options) {
      expect(option.prompt.trim().length).toBeGreaterThan(0)
      expect(option.label.trim().length).toBeGreaterThan(0)
    }
  })
})
