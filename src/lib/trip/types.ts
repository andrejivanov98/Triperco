export interface Coords {
  lat: number
  lng: number
}

export interface ReviewSnippet {
  author?: string
  rating?: number
  text: string
}

export interface Place {
  id: string
  name: string
  coords?: Coords
  category?: string
  rating?: number
  reviewCount?: number
  priceLevel?: number
  photos: string[]
  reviewSnippets: ReviewSnippet[]
  hours?: string
  address?: string
  sourceLinks: { maps?: string; tripadvisor?: string }
}

export interface Flight {
  id: string
  from: string
  to: string
  airline?: string
  departTime?: string
  arriveTime?: string
  durationMinutes?: number
  stops: number
  /** Price per traveler, in the trip's base currency. */
  price: number
  bookUrl: string
}

export interface Stay {
  id: string
  name: string
  source: 'hotel' | 'airbnb'
  coords?: Coords
  rating?: number
  reviewCount?: number
  pricePerNight: number
  nights: number
  photos: string[]
  bookUrl: string
}

export interface ItineraryItem {
  placeId: string
  name: string
  coords?: Coords
  note?: string
}

export interface Day {
  date?: string
  items: ItineraryItem[]
}

export interface TripMeta {
  destination?: string
  startDate?: string
  endDate?: string
  travelers: number
  budget?: number
}

export interface TripState {
  id: string
  meta: TripMeta
  flights: Flight[]
  stays: Stay[]
  days: Day[]
  estimatedTotal: number
}
