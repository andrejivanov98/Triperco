import { describe, it, expect } from 'vitest'
import {
  contractBreach,
  isUnusableTurn,
  usableProse,
  RECOVERY_TEXT,
  RECOVERY_REPLIES,
  REPAIR_INSTRUCTION,
} from './turnQuality'

describe('usableProse', () => {
  it('keeps ordinary conversation as-is', () => {
    expect(usableProse('14 stays in Trastevere — the first is the best value.')).toBe(
      '14 stays in Trastevere — the first is the best value.',
    )
  })

  it('is empty when the model answered with nothing but a code block', () => {
    expect(usableProse('```json\n{"flights": []}\n```')).toBe('')
  })

  it('is empty for a bare payload', () => {
    expect(usableProse('{"tool": "searchHotels", "q": "Rome"}')).toBe('')
  })

  it('keeps the prose that surrounds a code block', () => {
    expect(usableProse('Found 12.\n```\ncode\n```\nThe first is cheapest.')).toBe(
      'Found 12. The first is cheapest.',
    )
  })

  it('is empty for whitespace', () => {
    expect(usableProse('   \n\n  ')).toBe('')
  })
})

describe('isUnusableTurn', () => {
  it('accepts a turn with a readable sentence', () => {
    expect(isUnusableTurn({ text: 'Here are 12 stays.', rendered: 0 })).toBe(false)
  })

  it('accepts a wordless turn that still rendered cards', () => {
    // Cards alone are a complete answer; the traveler has something to act on.
    expect(isUnusableTurn({ text: '', rendered: 3 })).toBe(false)
  })

  it('rejects a turn that produced nothing at all', () => {
    expect(isUnusableTurn({ text: '', rendered: 0 })).toBe(true)
    expect(isUnusableTurn({ text: '   ', rendered: 0 })).toBe(true)
  })

  it('rejects a turn whose only output was code, with nothing rendered beside it', () => {
    expect(isUnusableTurn({ text: '```json\n{"a":1}\n```', rendered: 0 })).toBe(true)
  })

  it('accepts code-only prose when cards carry the answer', () => {
    // The garbage is stripped at render; the cards still answer the question.
    expect(isUnusableTurn({ text: '```json\n{"a":1}\n```', rendered: 2 })).toBe(false)
  })
})

/**
 * The failure the empty-turn check could never see: a turn that talks and does nothing.
 *
 * "Alright, I'll look into flights from Skopje to Tenerife for those dates for two adults" is
 * readable prose, so it passed every check there was, while the traveler sat looking at a promise
 * and no flights.
 */
describe('contractBreach', () => {
  const delivers = { delivers: true }
  const asks = { delivers: false }

  it('passes a delivery stage that put cards on screen', () => {
    expect(contractBreach({ text: 'Cheapest lands at midnight.', rendered: 3 }, delivers)).toBeNull()
  })

  it('catches a delivery stage that only talked about searching', () => {
    const turn = { text: "Alright, I'll look into flights from Skopje to Tenerife.", rendered: 0 }
    expect(contractBreach(turn, delivers)).toBe('stalled')
  })

  it('judges the outcome, not the wording — any prose with nothing behind it stalls', () => {
    expect(contractBreach({ text: 'Sounds lovely.', rendered: 0 }, delivers)).toBe('stalled')
  })

  it('lets a question stage end with prose and nothing rendered', () => {
    expect(contractBreach({ text: 'When were you thinking?', rendered: 0 }, asks)).toBeNull()
  })

  it('reports an empty bubble as empty, whatever the stage wanted', () => {
    expect(contractBreach({ text: '', rendered: 0 }, delivers)).toBe('empty')
    expect(contractBreach({ text: '```json\n{}\n```', rendered: 0 }, asks)).toBe('empty')
  })

  it('accepts a wordless delivery turn — the cards are the answer', () => {
    expect(contractBreach({ text: '', rendered: 2 }, delivers)).toBeNull()
  })
})

describe('recovery copy', () => {
  it('never leaks an error code, a stack or a provider name', () => {
    expect(RECOVERY_TEXT).not.toMatch(/error|stack|\b\d{3}\b|searchapi|gemini|google/i)
  })

  it('offers the traveler somewhere to go next', () => {
    expect(RECOVERY_REPLIES.length).toBeGreaterThanOrEqual(2)
    for (const reply of RECOVERY_REPLIES) expect(reply.length).toBeGreaterThan(0)
  })

  it('tells the model what to do differently on the repair attempt', () => {
    expect(REPAIR_INSTRUCTION).toMatch(/one short sentence/i)
  })
})
