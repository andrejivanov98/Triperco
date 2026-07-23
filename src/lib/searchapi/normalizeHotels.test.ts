import { describe, it, expect } from 'vitest'
import { normalizeHotels, type RawHotelsResponse } from './normalizeHotels'

const raw: RawHotelsResponse = {
  properties: [
    {
      name: 'Hotel Trastevere',
      type: 'hotel',
      price_per_night: { price: '$110', extracted_price: 110 },
      total_price: { price: '$330', extracted_price: 330 },
      rating: 4.6,
      reviews: 1204,
      gps_coordinates: { latitude: 41.88, longitude: 12.47 },
      images: [{ thumbnail: 'https://t/1', original: 'https://o/1' }],
      link: 'https://book/hotel',
      hotel_class: '4-star hotel',
    },
  ],
}

describe('normalizeHotels', () => {
  it('maps a property into a Stay with the given nights', () => {
    const [stay] = normalizeHotels(raw, 3)
    expect(stay.name).toBe('Hotel Trastevere')
    expect(stay.source).toBe('hotel')
    expect(stay.pricePerNight).toBe(110)
    expect(stay.nights).toBe(3)
    expect(stay.rating).toBe(4.6)
    expect(stay.reviewCount).toBe(1204)
    expect(stay.coords).toEqual({ lat: 41.88, lng: 12.47 })
    expect(stay.photos).toEqual(['https://o/1'])
    expect(stay.bookUrl).toBe('https://book/hotel')
    expect(stay.id).toBeTruthy()
  })

  it('returns [] with no properties', () => {
    expect(normalizeHotels({}, 2)).toEqual([])
  })
})
