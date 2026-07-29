import { describe, it, expect } from 'vitest'
import { chatSections } from './chatSections'
import type { TriperUIMessage } from './messages'
import type { ResultSet } from './results'
import type { Stay, Flight } from '@/lib/trip/types'

function stay(id: string): Stay {
  return { id, name: id, source: 'hotel', pricePerNight: 1, nights: 1, photos: [], bookUrl: 'x' }
}
function flight(id: string): Flight {
  return { id, from: 'SKP', to: 'TRN', stops: 0, price: 1, bookUrl: 'x' }
}

function assistant(id: string, ...sets: ResultSet[]): TriperUIMessage {
  return {
    id,
    role: 'assistant',
    parts: sets.map((data) => ({ type: 'data-results', data })),
  } as TriperUIMessage
}

describe('chatSections', () => {
  it('is empty until something has been searched', () => {
    expect(chatSections([])).toEqual([])
  })

  it('names each set for what the traveler would call it', () => {
    const sections = chatSections([
      assistant('m1', { kind: 'flights', query: 'SKP → TRN', flightType: 'one_way', items: [flight('f')] }),
      assistant('m2', { kind: 'stays', query: 'Turin', items: [stay('s')] }),
      assistant('m3', { kind: 'places', query: 'things to do in Turin', placeKind: 'event', items: [] }),
    ])
    expect(sections.map((s) => s.label)).toEqual([
      'Flights · SKP → TRN',
      'Stays in Turin',
      'Events · Things to do in Turin',
    ])
  })

  it('points at the anchor the chat renders', () => {
    const [section] = chatSections([assistant('m7', { kind: 'stays', query: 'Turin', items: [stay('s')] })])
    expect(section.id).toBe('m7:0')
  })

  it('keeps the way home separate from the way out', () => {
    const sections = chatSections([
      assistant('m1', { kind: 'flights', query: 'SKP → TRN', flightType: 'one_way', items: [] }),
      assistant('m2', { kind: 'flights', query: 'TRN → SKP', flightType: 'return', items: [] }),
    ])
    expect(sections).toHaveLength(2)
    expect(sections[1].label).toMatch(/flights home/i)
  })

  it('replaces its own entry when the same search runs again', () => {
    const sections = chatSections([
      assistant('m1', { kind: 'stays', query: 'Turin', items: [stay('a')] }),
      assistant('m2', { kind: 'stays', query: 'Turin', items: [stay('b')] }),
    ])
    expect(sections).toHaveLength(1)
    // It points at the live set, not the collapsed one.
    expect(sections[0].id).toBe('m2:0')
  })

  it('falls back to the destination when a search carried no query', () => {
    const [section] = chatSections([assistant('m1', { kind: 'stays', items: [stay('a')] })], 'Turin')
    expect(section.label).toBe('Stays in Turin')
  })
})
