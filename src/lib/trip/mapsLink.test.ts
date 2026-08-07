import { describe, it, expect } from 'vitest'
import { directionsUrl, journeyUrl, placeUrl, telUrl } from './mapsLink'

describe('directionsUrl', () => {
  it('prefers coordinates, which cannot be confused with another place of the same name', () => {
    const url = directionsUrl({ name: 'Hotel Artemide', coords: { lat: 41.895, lng: 12.494 } })
    expect(url).toContain('destination=41.895%2C12.494')
  })

  it('falls back to the name and address together', () => {
    const url = directionsUrl({ name: 'Hotel Artemide', address: 'Via Nazionale 22, Rome' })
    expect(url).toContain('Hotel+Artemide')
    expect(url).toContain('Via+Nazionale')
  })

  it('is undefined with nothing to route to', () => {
    expect(directionsUrl({})).toBeUndefined()
    expect(directionsUrl({ name: '' })).toBeUndefined()
  })

  it('always produces a url a phone will open', () => {
    const url = directionsUrl({ name: 'Colosseum' })!
    expect(() => new URL(url)).not.toThrow()
    expect(url.startsWith('https://www.google.com/maps/dir/')).toBe(true)
  })
})

describe('placeUrl', () => {
  it('uses the provider place id when we have one', () => {
    expect(placeUrl({ placeId: 'PID1', name: 'Colosseum' })).toBe(
      'https://www.google.com/maps/place/?q=place_id:PID1',
    )
  })

  it('searches by name and address otherwise', () => {
    const url = placeUrl({ name: 'Colosseum', address: 'Piazza del Colosseo, Rome' })!
    expect(url).toContain('/maps/search/')
    expect(url).toContain('Colosseum')
  })

  it('is undefined with nothing to look up', () => {
    expect(placeUrl({})).toBeUndefined()
  })
})

/**
 * The one manual step left on a journey we could not price.
 *
 * Told there were no times, the traveler opened Maps — and Maps asked arrivals or departures, then
 * which terminal, then which mode. Naming the mode in the link collapses that into one tap, and
 * coordinates as the endpoints skip the disambiguation entirely.
 */
describe('journeyUrl', () => {
  it('opens a journey between two named places', () => {
    const url = journeyUrl('FCO airport', 'Hotel Artemide, Rome')!
    expect(url).toContain('/maps/dir/')
    expect(url).toContain('origin=FCO+airport')
    expect(url).toContain('destination=Hotel+Artemide%2C+Rome')
  })

  it('chooses the mode when one is named, so Maps does not have to ask', () => {
    expect(journeyUrl('a', 'b', 'transit')).toContain('travelmode=transit')
    expect(journeyUrl('a', 'b', 'driving')).toContain('travelmode=driving')
    expect(journeyUrl('a', 'b', 'walking')).toContain('travelmode=walking')
  })

  it('leaves the mode to Maps when none is named', () => {
    expect(journeyUrl('a', 'b')).not.toContain('travelmode')
  })

  it('is undefined without both ends', () => {
    expect(journeyUrl('', 'b')).toBeUndefined()
    expect(journeyUrl('a', '   ')).toBeUndefined()
  })
})

describe('telUrl', () => {
  it('makes a phone number pressable', () => {
    expect(telUrl('+39 06 489 911')).toBe('tel:+3906489911')
  })

  it('ignores something that is not a number', () => {
    expect(telUrl('ask at reception')).toBeUndefined()
    expect(telUrl(undefined)).toBeUndefined()
    expect(telUrl('12')).toBeUndefined()
  })
})
