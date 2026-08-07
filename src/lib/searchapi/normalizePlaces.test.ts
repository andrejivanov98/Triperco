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

  it('keeps contact details, description and types', () => {
    const [place] = normalizePlaces({
      local_results: [
        {
          title: 'Roscioli',
          place_id: 'PID2',
          phone: '+39 06 687 5287',
          website: 'https://roscioli.com',
          description: 'Deli-restaurant famous for carbonara.',
          types: ['Italian restaurant', 'Deli'],
          price: '$$$',
        },
      ],
    })
    expect(place.phone).toBe('+39 06 687 5287')
    expect(place.website).toBe('https://roscioli.com')
    expect(place.description).toContain('carbonara')
    expect(place.types).toEqual(['Italian restaurant', 'Deli'])
    expect(place.priceRange).toBe('$$$')
  })

  it('flattens the provider extension groups into service options', () => {
    const [place] = normalizePlaces({
      local_results: [
        {
          title: 'Tonnarello',
          place_id: 'PID4',
          extensions: [
            {
              title: 'Service options',
              items: [
                { title: 'Outdoor seating', value: 'Has outdoor seating' },
                { title: 'Delivery', value: 'Offers delivery' },
              ],
            },
            {
              title: 'Accessibility',
              items: [{ title: 'Wheelchair accessible entrance' }],
            },
          ],
        },
      ],
    })
    expect(place.serviceOptions).toEqual([
      'Outdoor seating',
      'Delivery',
      'Wheelchair accessible entrance',
    ])
  })

  it('reads open-now and per-day hours from open_hours', () => {
    const [place] = normalizePlaces({
      local_results: [
        {
          title: 'Vatican Museums',
          place_id: 'PID3',
          open_state: 'Open',
          hours: 'Open · Closes 6 PM',
          open_hours: { monday: '9 AM–6 PM', tuesday: 'Closed' },
        },
      ],
    })
    expect(place.openNow).toBe(true)
    expect(place.hours).toBe('Open · Closes 6 PM')
    expect(place.hoursByDay).toEqual([
      { day: 'Monday', hours: '9 AM–6 PM' },
      { day: 'Tuesday', hours: 'Closed' },
    ])
  })

  it('reads closed state as open-now false', () => {
    const [place] = normalizePlaces({
      local_results: [{ title: 'X', place_id: 'P', open_state: 'Closed' }],
    })
    expect(place.openNow).toBe(false)
  })

  it('keeps the provider review quote as a first snippet', () => {
    const [place] = normalizePlaces({
      local_results: [
        { title: 'X', place_id: 'P', review_text: '"Excellent timing on the food!"' },
      ],
    })
    expect(place.reviewSnippets).toEqual([{ text: '"Excellent timing on the food!"' }])
  })
})

/**
 * Asking Maps about a city — which is exactly what the plan's cover photo does — comes back with one
 * result whose `images` are photo *categories*: objects with a title and a thumbnail, not urls.
 * Treating one as a string threw inside the size-capper, and because that ran inside a `.map` over
 * every result it failed the whole search. The visible symptom was a plan with no cover image; the
 * invisible one was any places search containing such a result returning nothing at all.
 */
describe('normalizePlaces — the shapes a photo arrives in', () => {
  it('reads gallery photos given as urls', () => {
    const [place] = normalizePlaces({
      local_results: [
        { title: 'X', place_id: 'P', images: ['https://g/1', 'https://g/2'], thumbnail: 'https://t/1' },
      ],
    })
    expect(place.photos).toEqual(['https://g/1', 'https://g/2', 'https://t/1'])
  })

  it('reads a city result whose images are category tiles', () => {
    const [place] = normalizePlaces({
      local_results: [
        {
          title: 'Rome',
          place_id: 'PROME',
          thumbnail: 'https://lh3.example/t=w86-h86-k-no',
          images: [
            { title: 'All', thumbnail: 'https://lh3.example/all=w224-h298-k-no' },
            { title: 'Latest', thumbnail: 'https://lh3.example/latest=w224-h298-k-no' },
          ],
        },
      ],
    })
    expect(place.photos).toEqual([
      'https://lh3.example/all=w800-h800-k-no',
      'https://lh3.example/latest=w800-h800-k-no',
      'https://lh3.example/t=w800-h800-k-no',
    ])
  })

  it('keeps the rest of the search when one result has an unreadable photo', () => {
    const places = normalizePlaces({
      local_results: [
        // @ts-expect-error — deliberately the shape the provider is not documented to send.
        { title: 'Odd', place_id: 'P1', images: [{ nothing: true }, 42, null] },
        { title: 'Fine', place_id: 'P2', thumbnail: 'https://t/2' },
      ],
    })
    expect(places.map((p) => p.name)).toEqual(['Odd', 'Fine'])
    expect(places[0].photos).toEqual([])
    expect(places[1].photos).toEqual(['https://t/2'])
  })
})

describe('normalizePlaces — closed state', () => {
  it('flags a permanently closed place', () => {
    const [place] = normalizePlaces({
      local_results: [{ title: 'Old Bar', place_id: 'P', open_state: 'Permanently closed' }],
    })
    expect(place.permanentlyClosed).toBe(true)
    expect(place.openNow).toBe(false)
  })

  it('flags a temporarily closed place too', () => {
    const [place] = normalizePlaces({
      local_results: [{ title: 'Museum', place_id: 'P', open_state: 'Temporarily closed' }],
    })
    expect(place.permanentlyClosed).toBe(true)
  })

  it('leaves a place that is only shut right now open for planning', () => {
    const [place] = normalizePlaces({
      local_results: [{ title: 'Bar', place_id: 'P', open_state: 'Closed ⋅ Opens 6 PM' }],
    })
    expect(place.permanentlyClosed).toBeUndefined()
    expect(place.openNow).toBe(false)
  })
})
