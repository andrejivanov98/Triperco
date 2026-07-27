export interface Coords {
  lat: number
  lng: number
}

export interface ReviewSnippet {
  author?: string
  rating?: number
  text: string
  date?: string
  likes?: number
}

/** A star bucket from a property's rating histogram. */
export interface RatingBucket {
  stars: number
  count: number
}

/** What reviewers say about one topic, e.g. "location: 240 positive / 12 negative". */
export interface ReviewTopic {
  name: string
  positive?: number
  negative?: number
  neutral?: number
  total?: number
}

export interface NearbyPlace {
  name: string
  /** e.g. "12 min · Walking" */
  transit?: string
  category?: string
  rating?: number
}

/** One place you can actually book this stay, as offered by the provider. */
export interface StayOffer {
  source: string
  logo?: string
  url?: string
  pricePerNight?: number
  totalPrice?: number
  /** True when the offer is the property's own site. */
  official?: boolean
}

/** How this price compares to the norm for the property. */
export interface PriceInsight {
  /** e.g. "typical", "low", "high". */
  level?: string
  lowest?: string
  typicalLow?: string
  typicalHigh?: string
}

export interface Place {
  id: string
  name: string
  coords?: Coords
  category?: string
  types?: string[]
  rating?: number
  reviewCount?: number
  priceLevel?: number
  /** Raw range string when the provider gives one, e.g. "$10–20". */
  priceRange?: string
  photos: string[]
  reviewSnippets: ReviewSnippet[]
  hours?: string
  /** Per-day opening hours, when available. */
  hoursByDay?: { day: string; hours: string }[]
  openNow?: boolean
  address?: string
  phone?: string
  website?: string
  description?: string
  /** e.g. "Dine-in", "Takeaway", "Wheelchair accessible entrance". */
  serviceOptions?: string[]
  sourceLinks: { maps?: string; tripadvisor?: string }
}

/** One leg of a flight itinerary. */
export interface FlightSegment {
  airline?: string
  airlineLogo?: string
  flightNumber?: string
  aircraft?: string
  cabin?: string
  legroom?: string
  fromCode: string
  fromName?: string
  toCode: string
  toName?: string
  departTime?: string
  departDate?: string
  arriveTime?: string
  arriveDate?: string
  durationMinutes?: number
  /** Provider notes, e.g. "Wi-Fi for a fee", "Above average legroom". */
  extensions?: string[]
}

export interface Layover {
  code?: string
  name?: string
  durationMinutes?: number
  overnight?: boolean
}

export interface Flight {
  id: string
  from: string
  to: string
  airline?: string
  airlineLogo?: string
  departTime?: string
  departDate?: string
  arriveTime?: string
  arriveDate?: string
  durationMinutes?: number
  stops: number
  /** Price per traveler, in the trip's base currency. */
  price: number
  bookUrl: string
  bookingStatus?: 'not_booked' | 'booked'
  segments?: FlightSegment[]
  layovers?: Layover[]
  /** Grams of CO2e for this itinerary, as reported by the provider. */
  carbonGrams?: number
  /** Percent difference vs. the typical route emissions. */
  carbonVsTypical?: number
  bookingToken?: string
  /** Itinerary-level notes from the provider. */
  extensions?: string[]
}

export interface Stay {
  id: string
  name: string
  source: 'hotel' | 'airbnb'
  /** Finer-grained provider type: a hotel room vs. a whole place. */
  kind?: 'hotel' | 'vacation_rental'
  coords?: Coords
  rating?: number
  reviewCount?: number
  pricePerNight: number
  nights: number
  /** Provider total for the whole stay, when given (may include taxes/fees). */
  totalPrice?: number
  photos: string[]
  bookUrl: string
  bookingStatus?: 'not_booked' | 'booked'
  propertyToken?: string
  /** Star class, e.g. "4-star hotel". */
  hotelClass?: string
  description?: string
  address?: string
  checkInTime?: string
  checkOutTime?: string
  amenities?: string[]
  excludedAmenities?: string[]
  ratingsBreakdown?: RatingBucket[]
  reviewTopics?: ReviewTopic[]
  reviewSnippets?: ReviewSnippet[]
  nearbyPlaces?: NearbyPlace[]
  /** e.g. "24% less than usual". */
  dealBadge?: string
  essentialInfo?: string[]
  ecoCertified?: boolean
  phone?: string
  /** Every provider selling this stay, so the traveler can compare without leaving. */
  offers?: StayOffer[]
  priceInsight?: PriceInsight
  locationRating?: number
  thingsToDoRating?: number
  transitRating?: number
  airportRating?: number
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
  title?: string
  coverImage?: string
  /** Where the traveler is flying from, once known (IATA code or city). */
  origin?: string
  rooms?: number
  adults?: number
  children?: number
}

export interface TripState {
  id: string
  meta: TripMeta
  flights: Flight[]
  stays: Stay[]
  days: Day[]
  estimatedTotal: number
}
