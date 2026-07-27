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

const rich: RawHotelsResponse = {
  properties: [
    {
      name: 'Palazzo Nazionale',
      type: 'hotel',
      property_token: 'prop_1',
      hotel_class: '5-star hotel',
      description: 'Elegant rooms with a rooftop bar overlooking the city.',
      address: 'Via Nazionale 22, Rome',
      check_in_time: '3:00 PM',
      check_out_time: '11:00 AM',
      price_per_night: { extracted_price: 400 },
      total_price: { extracted_price: 1600 },
      deal: '24% less than usual',
      eco_certified: true,
      amenities: ['Free Wi-Fi', 'Pool', 'Air conditioning'],
      excluded_amenities: ['Airport shuttle'],
      essential_info: ['Cancellation is free'],
      ratings: [
        { stars: 5, count: 800 },
        { stars: 4, count: 200 },
      ],
      reviews_breakdown: [
        { name: 'Location', positive: 240, negative: 12, neutral: 4, total_mentioned: 256 },
      ],
      nearby_places: [
        { name: 'Termini Station', transportations: [{ type: 'Walking', duration: '8 min' }] },
      ],
      user_reviews: [{ user: { name: 'Marco' }, rating: 5, snippet: 'Spotless and central.' }],
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

  it('keeps the class, total price, address, check-in times and deal badge', () => {
    const [stay] = normalizeHotels(rich, 4)
    expect(stay.hotelClass).toBe('5-star hotel')
    expect(stay.totalPrice).toBe(1600)
    expect(stay.address).toBe('Via Nazionale 22, Rome')
    expect(stay.checkInTime).toBe('3:00 PM')
    expect(stay.checkOutTime).toBe('11:00 AM')
    expect(stay.dealBadge).toBe('24% less than usual')
    expect(stay.ecoCertified).toBe(true)
    expect(stay.propertyToken).toBe('prop_1')
    expect(stay.description).toContain('rooftop')
  })

  it('keeps amenities, excluded amenities and essential info', () => {
    const [stay] = normalizeHotels(rich, 4)
    expect(stay.amenities).toEqual(['Free Wi-Fi', 'Pool', 'Air conditioning'])
    expect(stay.excludedAmenities).toEqual(['Airport shuttle'])
    expect(stay.essentialInfo).toEqual(['Cancellation is free'])
  })

  it('keeps the rating histogram and review topics', () => {
    const [stay] = normalizeHotels(rich, 4)
    expect(stay.ratingsBreakdown).toEqual([
      { stars: 5, count: 800 },
      { stars: 4, count: 200 },
    ])
    expect(stay.reviewTopics).toEqual([
      { name: 'Location', positive: 240, negative: 12, neutral: 4, total: 256 },
    ])
  })

  it('keeps nearby places and review snippets', () => {
    const [stay] = normalizeHotels(rich, 4)
    expect(stay.nearbyPlaces).toEqual([{ name: 'Termini Station', transit: '8 min · Walking' }])
    expect(stay.reviewSnippets).toEqual([
      { author: 'Marco', rating: 5, text: 'Spotless and central.' },
    ])
  })

  it('marks a vacation rental as a whole place', () => {
    const [stay] = normalizeHotels(
      { properties: [{ name: 'Loft in Monti', type: 'vacation rental' }] },
      2,
    )
    expect(stay.kind).toBe('vacation_rental')
  })

  it('falls back to total price / nights when no nightly rate is given', () => {
    const [stay] = normalizeHotels(
      { properties: [{ name: 'Casa', total_price: { extracted_price: 400 } }] },
      4,
    )
    expect(stay.pricePerNight).toBe(100)
  })
})
