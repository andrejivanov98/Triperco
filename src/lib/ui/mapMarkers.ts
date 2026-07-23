import type { TripState } from '../trip/types'

export interface MapMarker {
  id: string
  name: string
  lng: number
  lat: number
  kind: 'stay' | 'place'
}

/** Flatten a trip's stays + itinerary items (those with coords) into map markers. */
export function tripToMarkers(trip: TripState): MapMarker[] {
  const markers: MapMarker[] = []

  for (const stay of trip.stays) {
    if (stay.coords) {
      markers.push({
        id: `stay-${stay.id}`,
        name: stay.name,
        lng: stay.coords.lng,
        lat: stay.coords.lat,
        kind: 'stay',
      })
    }
  }

  trip.days.forEach((day, dayIndex) => {
    for (const item of day.items) {
      if (item.coords) {
        markers.push({
          id: `day${dayIndex}-${item.placeId}`,
          name: item.name,
          lng: item.coords.lng,
          lat: item.coords.lat,
          kind: 'place',
        })
      }
    }
  })

  return markers
}
