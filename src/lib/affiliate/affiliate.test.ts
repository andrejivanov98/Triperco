import { describe, it, expect } from 'vitest'
import { buildOutboundUrl } from './affiliate'

describe('buildOutboundUrl', () => {
  it('adds a Booking.com aid when configured', () => {
    const out = buildOutboundUrl(
      'booking',
      'https://www.booking.com/hotel/it/x.html',
      { bookingAid: '12345' },
    )
    expect(out).toContain('aid=12345')
  })

  it('adds a Travelpayouts marker for flights when configured', () => {
    const out = buildOutboundUrl('flight', 'https://airline.com/book?f=1', {
      travelpayoutsMarker: 'mk99',
    })
    expect(out).toContain('marker=mk99')
    // preserves existing query params
    expect(out).toContain('f=1')
  })

  it('returns the url unchanged for airbnb (no program)', () => {
    const url = 'https://www.airbnb.com/rooms/42'
    expect(buildOutboundUrl('airbnb', url)).toBe(url)
  })

  it('returns the url unchanged for generic with no config', () => {
    const url = 'https://example.com/thing?a=1'
    expect(buildOutboundUrl('generic', url)).toBe(url)
  })
})
