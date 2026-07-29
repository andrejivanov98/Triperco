import { describe, it, expect } from 'vitest'
import { readOpeningContext, contextToMeta, buildOpeningMessage } from './openingMessage'

describe('readOpeningContext', () => {
  it('reads the composer params', () => {
    const params = new URLSearchParams(
      'q=Rome+for+a+long+weekend&start=2026-09-01&end=2026-09-04&rooms=2&adults=3&children=1',
    )
    expect(readOpeningContext(params)).toMatchObject({
      q: 'Rome for a long weekend',
      startDate: '2026-09-01',
      endDate: '2026-09-04',
      rooms: 2,
      adults: 3,
      children: 1,
    })
  })

  it('ignores junk numbers', () => {
    const context = readOpeningContext(new URLSearchParams('adults=abc&rooms=0&children=-2'))
    expect(context.adults).toBeUndefined()
    expect(context.rooms).toBeUndefined()
    expect(context.children).toBeUndefined()
  })

  it('is empty with no params', () => {
    expect(readOpeningContext(new URLSearchParams())).toEqual({
      q: undefined,
      destination: undefined,
      startDate: undefined,
      endDate: undefined,
      rooms: undefined,
      adults: undefined,
      children: undefined,
      travelers: undefined,
    })
  })
})

describe('contextToMeta', () => {
  it('counts adults and children as travelers', () => {
    expect(contextToMeta({ adults: 2, children: 2 })).toMatchObject({ travelers: 4, adults: 2, children: 2 })
  })

  it('keeps rooms', () => {
    expect(contextToMeta({ rooms: 2, adults: 3 }).rooms).toBe(2)
  })

  it('falls back to a plain traveler count', () => {
    expect(contextToMeta({ travelers: 3 }).travelers).toBe(3)
  })

  it('omits everything it was not given', () => {
    expect(contextToMeta({})).toEqual({})
  })
})

describe('buildOpeningMessage', () => {
  it('passes free text through untouched when there is no extra context', () => {
    expect(buildOpeningMessage({ q: 'a week in Japan' })).toBe('a week in Japan')
  })

  it('appends dates and party to free text', () => {
    expect(
      buildOpeningMessage({
        q: 'Somewhere warm',
        startDate: '2026-11-02',
        endDate: '2026-11-09',
        adults: 2,
        children: 1,
      }),
    ).toBe('Somewhere warm. Travelling from 2026-11-02 to 2026-11-09 for 2 adults, 1 child.')
  })

  it('does not double the full stop', () => {
    expect(buildOpeningMessage({ q: 'Plan Rome!', adults: 2 })).toBe(
      'Plan Rome! Travelling for 2 adults.',
    )
  })

  it('mentions rooms only when more than one', () => {
    expect(buildOpeningMessage({ q: 'Rome', rooms: 1, adults: 2 })).not.toContain('room')
    expect(buildOpeningMessage({ q: 'Rome', rooms: 2, adults: 4 })).toContain('2 rooms')
  })

  it('composes a message from structured context alone', () => {
    expect(
      buildOpeningMessage({ destination: 'Rome', startDate: '2026-09-01', endDate: '2026-09-04', adults: 2 }),
    ).toBe('Plan my trip to Rome from 2026-09-01 to 2026-09-04 for 2 adults.')
  })

  it('handles a start date with no end', () => {
    expect(buildOpeningMessage({ destination: 'Rome', startDate: '2026-09-01' })).toBe(
      'Plan my trip to Rome starting 2026-09-01.',
    )
  })

  it('says nothing when there is nothing to say', () => {
    expect(buildOpeningMessage({})).toBeNull()
  })
})
