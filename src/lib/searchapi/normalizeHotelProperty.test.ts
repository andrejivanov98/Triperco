import { describe, it, expect } from 'vitest'
import { normalizeHotelProperty, type RawPropertyResponse } from './normalizeHotelProperty'

// Shaped after a real google_hotels_property response.
const raw: RawPropertyResponse = {
  property: {
    type: 'hotel',
    property_token: 'tok_1',
    name: 'Salotto Monti',
    link: 'https://salottomonti.com/',
    address: 'Via della Consulta, 1B, 00184 Roma RM, Italy',
    phone: '+39 335 794 0147',
    check_in_time: '2:00 PM',
    check_out_time: '11:00 AM',
    hotel_class: '3-star hotel',
    deal: '16% less than usual',
    rating: 4.6,
    reviews: 459,
    price_per_night: { price: '$338', extracted_price: 338 },
    total_price: { price: '$1,350', extracted_price: 1350 },
    price_insights: {
      lowest_price: '$308',
      price_level: 'typical',
      typical_price_range: { low_price: '$302', high_price: '$397' },
    },
    reviews_histogram: { 1: 11, 2: 10, 3: 13, 4: 77, 5: 348 },
    reviews_breakdown: [
      { name: 'Service', total_mentions: 132, positive: 124, neutral: 4, negative: 4 },
    ],
    review_results: {
      reviews: [{ username: 'Tracy Lulic', text: '"Breakfast was included."' }],
    },
    location_rating: 4.7,
    proximity_to_things_to_do_rating: 4.9,
    proximity_to_transit_rating: 4.9,
    airport_access_rating: 3.1,
    images: [{ thumbnail: 'https://t/1', original: 'https://o/1' }],
    nearby_places: [
      {
        name: 'Trevi Fountain',
        category: 'Point of interest',
        rating: 4.7,
        transportations: [{ type: 'Walking', duration: '9 min' }],
      },
    ],
    featured_offers: [
      {
        source: 'Expedia.com',
        logo: 'https://logo/expedia',
        tracking_link: 'https://track/expedia',
        price_per_night: { extracted_price: 396 },
        total_price: { extracted_price: 1586 },
      },
    ],
    all_offers: [
      {
        source: 'Salotto Monti',
        link: 'https://salottomonti.com/book',
        is_official: true,
        price_per_night: { extracted_price: 338 },
        total_price: { extracted_price: 1350 },
      },
      {
        source: 'Expedia.com',
        tracking_link: 'https://track/expedia',
        price_per_night: { extracted_price: 396 },
      },
    ],
  },
}

describe('normalizeHotelProperty', () => {
  it('maps the core facts', () => {
    const p = normalizeHotelProperty(raw, 4)!
    expect(p.name).toBe('Salotto Monti')
    expect(p.hotelClass).toBe('3-star hotel')
    expect(p.address).toContain('Via della Consulta')
    expect(p.phone).toBe('+39 335 794 0147')
    expect(p.checkInTime).toBe('2:00 PM')
    expect(p.checkOutTime).toBe('11:00 AM')
    expect(p.dealBadge).toBe('16% less than usual')
    expect(p.pricePerNight).toBe(338)
    expect(p.totalPrice).toBe(1350)
    expect(p.nights).toBe(4)
    expect(p.photos).toEqual(['https://o/1'])
  })

  it('turns the reviews histogram into star buckets', () => {
    const p = normalizeHotelProperty(raw, 4)!
    expect(p.ratingsBreakdown).toEqual([
      { stars: 1, count: 11 },
      { stars: 2, count: 10 },
      { stars: 3, count: 13 },
      { stars: 4, count: 77 },
      { stars: 5, count: 348 },
    ])
  })

  it('reads review topics from total_mentions', () => {
    const p = normalizeHotelProperty(raw, 4)!
    expect(p.reviewTopics).toEqual([
      { name: 'Service', positive: 124, negative: 4, neutral: 4, total: 132 },
    ])
  })

  it('reads reviewer quotes from review_results', () => {
    const p = normalizeHotelProperty(raw, 4)!
    // The provider wraps its own quotes around the body; ours come from the blockquote.
    expect(p.reviewSnippets).toEqual([{ text: 'Breakfast was included.' }])
  })

  it("never carries the reviewer's name", () => {
    const property = normalizeHotelProperty(raw, 4)!
    for (const review of property.reviewSnippets ?? []) expect(review).not.toHaveProperty('author')
  })

  it('keeps the sub-ratings and price insight', () => {
    const p = normalizeHotelProperty(raw, 4)!
    expect(p.locationRating).toBe(4.7)
    expect(p.thingsToDoRating).toBe(4.9)
    expect(p.transitRating).toBe(4.9)
    expect(p.airportRating).toBe(3.1)
    expect(p.priceInsight).toEqual({
      level: 'typical',
      lowest: '$308',
      typicalLow: '$302',
      typicalHigh: '$397',
    })
  })

  it('collects every booking offer, cheapest first, marking the official one', () => {
    const p = normalizeHotelProperty(raw, 4)!
    expect(p.offers).toEqual([
      {
        source: 'Salotto Monti',
        url: 'https://salottomonti.com/book',
        official: true,
        pricePerNight: 338,
        totalPrice: 1350,
      },
      {
        source: 'Expedia.com',
        logo: 'https://logo/expedia',
        url: 'https://track/expedia',
        pricePerNight: 396,
        totalPrice: 1586,
      },
    ])
  })

  it('prefers the official site as the booking link', () => {
    const p = normalizeHotelProperty(raw, 4)!
    expect(p.bookUrl).toBe('https://salottomonti.com/book')
  })

  it('maps nearby places with transit, category and rating', () => {
    const p = normalizeHotelProperty(raw, 4)!
    expect(p.nearbyPlaces).toEqual([
      { name: 'Trevi Fountain', transit: '9 min · Walking', category: 'Point of interest', rating: 4.7 },
    ])
  })

  it('returns null when the provider sends no property', () => {
    expect(normalizeHotelProperty({}, 3)).toBeNull()
  })
})
