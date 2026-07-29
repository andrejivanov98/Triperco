import { describe, it, expect } from 'vitest'
import { normalizeEvents, resolveEventDate, type RawEventsResponse } from './normalizeEvents'

const NOW = new Date('2026-07-28T00:00:00Z')

describe('resolveEventDate', () => {
  it('reads a day and month into a real date', () => {
    expect(resolveEventDate('28', 'Jul', NOW)).toBe('2026-07-28')
    expect(resolveEventDate('2', 'Aug', NOW)).toBe('2026-08-02')
  })

  it('rolls a month already past into next year', () => {
    // The provider gives no year, so "Feb 3" seen in July means next February.
    expect(resolveEventDate('3', 'Feb', NOW)).toBe('2027-02-03')
  })

  it('treats earlier this month as next year rather than the past', () => {
    expect(resolveEventDate('1', 'Jul', NOW)).toBe('2027-07-01')
  })

  it('gives up rather than guessing on rubbish', () => {
    expect(resolveEventDate('', '', NOW)).toBeUndefined()
    expect(resolveEventDate('40', 'Jul', NOW)).toBeUndefined()
    expect(resolveEventDate('12', 'Smarch', NOW)).toBeUndefined()
  })

  it('accepts a full month name', () => {
    expect(resolveEventDate('9', 'August', NOW)).toBe('2026-08-09')
  })
})

/** Shaped exactly like a verified google_events payload. */
const raw: RawEventsResponse = {
  events: [
    {
      position: 1,
      title: 'Noa in Concert in Rome, Italy',
      link: 'https://example.com/event',
      date: { day: '28', month: 'Jul' },
      duration: 'Tue, Jul 28, 9 PM – Wed, Jul 29, 12 AM GMT+2',
      address: 'Villa Osio, Viale di Porta Ardeatina, 55, Roma RM, Italy',
      location: 'Casa del Jazz',
      thumbnail: 'https://example.com/thumb.jpg',
      description: 'Noa torna in Italia.',
      venue: { name: 'Casa del Jazz', rating: 4.6, reviews: 2314 },
      offers: [
        { seller: 'Ticketone.it', link: 'https://tickets.example/1', link_type: 'tickets' },
        { seller: 'Viagogo', link: 'https://resell.example/1', link_type: 'more info' },
      ],
    },
    { title: '   ' },
  ],
}

describe('normalizeEvents', () => {
  it('drops an entry with no title', () => {
    expect(normalizeEvents(raw, NOW)).toHaveLength(1)
  })

  it('carries the event across as a dated thing to do', () => {
    const [event] = normalizeEvents(raw, NOW)
    expect(event).toMatchObject({
      name: 'Noa in Concert in Rome, Italy',
      activityKind: 'event',
      startDate: '2026-07-28',
      whenLabel: 'Tue, Jul 28, 9 PM – Wed, Jul 29, 12 AM GMT+2',
      venueName: 'Casa del Jazz',
      rating: 4.6,
      reviewCount: 2314,
    })
    expect(event.photos).toEqual(['https://example.com/thumb.jpg'])
  })

  it('prefers the offer you can actually buy from', () => {
    const [event] = normalizeEvents(raw, NOW)
    expect(event.ticketUrl).toBe('https://tickets.example/1')
    expect(event.ticketSellers).toEqual(['Ticketone.it', 'Viagogo'])
  })

  it('gives each event a stable id across searches', () => {
    const first = normalizeEvents(raw, NOW)[0].id
    const second = normalizeEvents(raw, NOW)[0].id
    expect(first).toBe(second)
    expect(first).toBe('evt-2026-07-28-noa-in-concert-in-rome-italy')
  })

  it('joins an address that arrives as a list', () => {
    const [event] = normalizeEvents(
      { events: [{ title: 'Festa', address: ['Piazza Navona', 'Rome'] }] },
      NOW,
    )
    expect(event.address).toBe('Piazza Navona, Rome')
  })

  it('falls back to the location when there is no venue name', () => {
    const [event] = normalizeEvents({ events: [{ title: 'Festa', location: 'Piazza Navona' }] }, NOW)
    expect(event.venueName).toBe('Piazza Navona')
  })

  it('survives a payload with almost nothing in it', () => {
    const [event] = normalizeEvents({ events: [{ title: 'Mystery' }] }, NOW)
    expect(event).toMatchObject({ name: 'Mystery', activityKind: 'event' })
    expect(event).not.toHaveProperty('startDate')
    expect(event.photos).toEqual([])
  })

  it('returns nothing for an empty response', () => {
    expect(normalizeEvents({}, NOW)).toEqual([])
  })
})
