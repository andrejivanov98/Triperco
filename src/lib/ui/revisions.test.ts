import { describe, it, expect } from 'vitest'
import { revisionsFor, setId } from './revisions'
import { resultSetKey, makeSetKey } from './results'
import type { ResultSet } from './results'
import type { TriperUIMessage } from './messages'
import type { Stay } from '@/lib/trip/types'

function stay(id: string): Stay {
  return {
    id,
    name: `Stay ${id}`,
    source: 'hotel',
    pricePerNight: 100,
    nights: 2,
    photos: [],
    bookUrl: 'https://book/' + id,
  }
}

function assistant(id: string, ...sets: ResultSet[]): TriperUIMessage {
  return {
    id,
    role: 'assistant',
    parts: sets.map((data) => ({ type: 'data-results', data })),
  } as TriperUIMessage
}

const stays = (key: string, ...ids: string[]): ResultSet => ({
  kind: 'stays',
  setKey: key,
  items: ids.map(stay),
})

describe('resultSetKey', () => {
  it('treats the same question asked differently as one question', () => {
    const a: ResultSet = { kind: 'stays', query: 'Rome ', items: [] }
    const b: ResultSet = { kind: 'stays', query: 'rome', items: [] }
    expect(resultSetKey(a)).toBe(resultSetKey(b))
  })

  it('keeps different searches apart', () => {
    expect(resultSetKey({ kind: 'stays', query: 'Rome', items: [] })).not.toBe(
      resultSetKey({ kind: 'stays', query: 'Naples', items: [] }),
    )
  })

  it('keeps each flight leg as its own question', () => {
    const out: ResultSet = { kind: 'flights', query: 'SKP → FCO', flightType: 'one_way', items: [] }
    const home: ResultSet = { kind: 'flights', query: 'SKP → FCO', flightType: 'return', items: [] }
    expect(resultSetKey(out)).not.toBe(resultSetKey(home))
  })

  it('prefers the key the server stamped', () => {
    expect(resultSetKey({ kind: 'stays', setKey: 'stays:rome', query: 'anything', items: [] })).toBe(
      'stays:rome',
    )
  })

  it('agrees with the key the server builds', () => {
    expect(makeSetKey('stays', ' Rome ')).toBe(resultSetKey({ kind: 'stays', query: 'Rome', items: [] }))
    expect(makeSetKey('flights', 'SKP → FCO', 'return')).toBe(
      resultSetKey({ kind: 'flights', query: 'SKP → FCO', flightType: 'return', items: [] }),
    )
  })
})

describe('revisionsFor', () => {
  it('marks an earlier search superseded once the same one runs again', () => {
    const messages = [
      assistant('m1', stays('stays:rome', 'a')),
      assistant('m2', stays('stays:rome', 'b')),
    ]
    const revisions = revisionsFor(messages)

    expect(revisions.get(setId('m1', 0))).toEqual({ revision: 1, superseded: true })
    expect(revisions.get(setId('m2', 0))).toEqual({ revision: 2, superseded: false })
  })

  it('leaves different searches both live', () => {
    const messages = [
      assistant('m1', stays('stays:rome', 'a')),
      assistant('m2', stays('stays:naples', 'b')),
    ]
    const revisions = revisionsFor(messages)
    expect(revisions.get(setId('m1', 0))?.superseded).toBe(false)
    expect(revisions.get(setId('m2', 0))?.superseded).toBe(false)
  })

  it('counts revisions through a run of refinements', () => {
    const messages = [
      assistant('m1', stays('stays:rome', 'a')),
      assistant('m2', stays('stays:rome', 'b')),
      assistant('m3', stays('stays:rome', 'c')),
    ]
    const revisions = revisionsFor(messages)
    expect(revisions.get(setId('m3', 0))).toEqual({ revision: 3, superseded: false })
    expect(revisions.get(setId('m2', 0))?.superseded).toBe(true)
  })

  it('handles two sets carried by one message', () => {
    const messages = [
      assistant('m1', stays('stays:rome', 'a'), stays('stays:naples', 'b')),
      assistant('m2', stays('stays:rome', 'c')),
    ]
    const revisions = revisionsFor(messages)
    expect(revisions.get(setId('m1', 0))?.superseded).toBe(true)
    expect(revisions.get(setId('m1', 1))?.superseded).toBe(false)
  })

  it('is empty for a thread with no results', () => {
    expect(revisionsFor([])).toEqual(new Map())
  })
})
