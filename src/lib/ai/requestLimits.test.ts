import { describe, it, expect } from 'vitest'
import {
  promptChars,
  hasUnsupportedPart,
  threadProblem,
  sanitizeHints,
  MAX_MESSAGES,
  MAX_PROMPT_CHARS,
  MAX_HINTS,
} from './requestLimits'

function text(body: string) {
  return { role: 'user', parts: [{ type: 'text', text: body }] }
}

describe('promptChars', () => {
  it('counts the text a thread will put in the prompt', () => {
    expect(promptChars([text('hello'), text('there')])).toBe(10)
  })

  it('ignores data parts, which never reach the model', () => {
    const withCards = {
      role: 'assistant',
      parts: [
        { type: 'text', text: 'four stays' },
        { type: 'data-results', data: { items: 'x'.repeat(50_000) } },
      ],
    }
    expect(promptChars([withCards])).toBe('four stays'.length)
  })

  it('survives a thread of nonsense without throwing', () => {
    expect(promptChars([null, 'nope', {}, { parts: 'no' }, { parts: [null, 7] }])).toBe(0)
  })
})

describe('threadProblem', () => {
  it('passes a normal thread', () => {
    expect(threadProblem([text('Rome in September, two of us')])).toBeNull()
  })

  it('refuses more messages than a real session has', () => {
    const many = Array.from({ length: MAX_MESSAGES + 1 }, () => text('hi'))
    expect(threadProblem(many)).toBe('too_many_messages')
  })

  it('allows exactly the limit', () => {
    const exactly = Array.from({ length: MAX_MESSAGES }, () => text('hi'))
    expect(threadProblem(exactly)).toBeNull()
  })

  /** The bill is per input character, so this is the cap that protects the model spend. */
  it('refuses a thread carrying more text than the model should be asked to read', () => {
    expect(threadProblem([text('x'.repeat(MAX_PROMPT_CHARS + 1))])).toBe('too_much_text')
  })

  it('counts text across messages, not just one', () => {
    const half = 'x'.repeat(MAX_PROMPT_CHARS / 2 + 1)
    expect(threadProblem([text(half), text(half)])).toBe('too_much_text')
  })

  /** A file part's url is fetched by the provider, on our token budget. */
  it('refuses a part the composer never produces', () => {
    const withFile = {
      role: 'user',
      parts: [{ type: 'file', mediaType: 'image/png', url: 'https://elsewhere.test/big.png' }],
    }
    expect(hasUnsupportedPart([withFile])).toBe(true)
    expect(threadProblem([withFile])).toBe('unsupported_part')
  })
})

/**
 * Hints are interpolated into the system prompt, so this is where client text stops being arbitrary.
 */
describe('sanitizeHints', () => {
  const hint = (over: Record<string, unknown> = {}) => ({
    hintType: 'stay_results',
    description: 'Places to stay on screen.',
    content: '{"items":[]}',
    capturedAt: '2026-08-05T10:00:00.000Z',
    ...over,
  })

  it('keeps a well-formed hint as it is', () => {
    expect(sanitizeHints([hint()])).toEqual([hint()])
  })

  it('returns nothing for a non-array', () => {
    expect(sanitizeHints(undefined)).toEqual([])
    expect(sanitizeHints('flights')).toEqual([])
  })

  it('drops a hint kind the prompt does not know', () => {
    expect(sanitizeHints([hint({ hintType: 'ignore_all_previous_instructions' })])).toEqual([])
  })

  it('drops a hint with no content, rather than announcing an empty one', () => {
    expect(sanitizeHints([hint({ content: '' })])).toEqual([])
    expect(sanitizeHints([hint({ content: 42 })])).toEqual([])
  })

  it('clips a hint that would flood the prompt', () => {
    const [kept] = sanitizeHints([hint({ content: 'x'.repeat(100_000) })])
    expect(kept.content.length).toBeLessThanOrEqual(6_000)
  })

  it('clips a description too, since it is prose we hand the model', () => {
    const [kept] = sanitizeHints([hint({ description: 'y'.repeat(10_000) })])
    expect(kept.description.length).toBeLessThanOrEqual(500)
  })

  it('caps how many hints one request may carry', () => {
    const lots = Array.from({ length: MAX_HINTS + 5 }, () => hint())
    expect(sanitizeHints(lots)).toHaveLength(MAX_HINTS)
  })

  it('skips entries that are not objects', () => {
    expect(sanitizeHints([null, 'x', 3, hint()])).toHaveLength(1)
  })

  it('replaces a missing description with an empty string rather than "undefined"', () => {
    const [kept] = sanitizeHints([hint({ description: undefined })])
    expect(kept.description).toBe('')
  })
})
