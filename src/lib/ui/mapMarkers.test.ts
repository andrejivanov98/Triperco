import { describe, it, expect } from 'vitest'
import { tripToMarkers } from './mapMarkers'
import { createTrip, addStay, addItineraryItem } from '../trip/tripState'

describe('tripToMarkers', () => {
  it('includes stays and itinerary items that have coords', () => {
    let trip = addStay(createTrip('t1'), {
      id: 's1', name: 'Hotel X', source: 'hotel', coords: { lat: 41.9, lng: 12.5 },
      pricePerNight: 100, nights: 2, photos: [], bookUrl: 'https://x',
    })
    trip = addItineraryItem(trip, 0, { placeId: 'p1', name: 'Colosseum', coords: { lat: 41.89, lng: 12.49 } })
    const markers = tripToMarkers(trip)
    expect(markers).toHaveLength(2)
    expect(markers.map((m) => m.kind).sort()).toEqual(['place', 'stay'])
    const hotel = markers.find((m) => m.kind === 'stay')!
    expect(hotel).toMatchObject({ name: 'Hotel X', lat: 41.9, lng: 12.5 })
  })

  it('skips items without coords', () => {
    const trip = addItineraryItem(createTrip('t1'), 0, { placeId: 'p1', name: 'No coords' })
    expect(tripToMarkers(trip)).toHaveLength(0)
  })
})
