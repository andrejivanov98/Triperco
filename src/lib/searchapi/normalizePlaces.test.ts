import { describe, it, expect } from 'vitest'
import { normalizePlaces, type RawMapsResponse } from './normalizePlaces'

const raw: RawMapsResponse = {
  local_results: [
    {
      title: 'Colosseum',
      place_id: 'PID1',
      data_id: 'DID1',
      address: 'Piazza del Colosseo, Rome',
      rating: 4.7,
      reviews: 390000,
      price: '$$',
      type: 'Historical landmark',
      types: ['Historical landmark', 'Tourist attraction'],
      gps_coordinates: { latitude: 41.8902, longitude: 12.4922 },
      thumbnail: 'https://t/colosseum',
      hours: 'Open ⋅ Closes 7 PM',
    },
  ],
}

describe('normalizePlaces', () => {
  it('maps a local result into a Place', () => {
    const [place] = normalizePlaces(raw)
    expect(place.id).toBe('PID1')
    expect(place.name).toBe('Colosseum')
    expect(place.coords).toEqual({ lat: 41.8902, lng: 12.4922 })
    expect(place.category).toBe('Historical landmark')
    expect(place.rating).toBe(4.7)
    expect(place.reviewCount).toBe(390000)
    expect(place.priceLevel).toBe(2) // "$$"
    expect(place.address).toBe('Piazza del Colosseo, Rome')
    expect(place.photos).toEqual(['https://t/colosseum'])
    expect(place.reviewSnippets).toEqual([]) // filled by enrichment later
    expect(place.sourceLinks.maps).toContain('PID1')
  })

  it('returns [] with no local_results', () => {
    expect(normalizePlaces({})).toEqual([])
  })
})
