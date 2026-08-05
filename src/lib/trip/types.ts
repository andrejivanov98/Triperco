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

/**
 * What sort of thing to do this is. They behave differently and flattening them loses what makes
 * each actionable.
 *
 * `attraction` — somewhere you go to see: a museum, a monument, a viewpoint. Hours matter.
 * `activity`   — something you go to do: eat, drink, swim, climb. Hours matter.
 * `tour`       — something you book ahead. Hours are irrelevant.
 * `event`      — happens once, on a fixed date you can miss.
 *
 * `attraction` keeps its name for compatibility: it is the fallback in existing shared threads and
 * in `resultSetKey`, so renaming it would silently re-bucket every set already in the wild.
 */
export type ActivityKind = 'attraction' | 'activity' | 'tour' | 'event'

export interface Place {
  id: string
  name: string
  coords?: Coords
  category?: string
  types?: string[]
  /** Absent means "work it out from the category". */
  activityKind?: ActivityKind
  /** Events only: the day it happens, YYYY-MM-DD. */
  startDate?: string
  /** Events only: the provider's own human range, e.g. "Tue, Jul 28, 9 PM – Wed, Jul 29, 12 AM". */
  whenLabel?: string
  /** Events only: where it is being held. */
  venueName?: string
  /** Events only: where to buy tickets. */
  ticketUrl?: string
  /** Events only: who is selling them. */
  ticketSellers?: string[]
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
  /** Shut for good (or indefinitely) — there is nothing to plan around. */
  permanentlyClosed?: boolean
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
  /** Which leg of the journey this is. */
  direction?: 'outbound' | 'return'
  /** One way, or half of a round trip whose price covers both legs. */
  tripType?: 'one_way' | 'round_trip'
  /**
   * For a round trip, the paired return leg. The provider prices the pair as one fare, so `price`
   * on the outbound already covers both — adding the flight puts both legs in the plan.
   */
  returnLeg?: Flight
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
  /** Kept so the plan can show the thing you picked, not a placeholder. */
  thumbnail?: string
  category?: string
  rating?: number
  reviewCount?: number
  address?: string
  bookUrl?: string
  /** Set once a tours provider supplies them. */
  price?: number
  durationMinutes?: number
}

export interface Day {
  date?: string
  items: ItineraryItem[]
}

/** How much the traveler wants to be asked, rather than told. */
export type TripPace = 'fast' | 'explore' | 'detailed'

/** The shape of trip they are after. A closed list, so it stays comparable across turns. */
export type TripVibe =
  | 'relaxed'
  | 'foodie'
  | 'culture'
  | 'nightlife'
  | 'family'
  | 'adventure'
  | 'budget'
  | 'luxury'

export const TRIP_VIBES: readonly TripVibe[] = [
  'relaxed',
  'foodie',
  'culture',
  'nightlife',
  'family',
  'adventure',
  'budget',
  'luxury',
]

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
  /** Under 2. Priced and seated differently, so they are not just more children. */
  infants?: number
  /** Ages change both price and what a place will accept, so they are worth carrying. */
  childrenAges?: number[]
  /** Travelling with a dog changes which stays are even possible. */
  pets?: number
  /** "Give or take a few days" — how far either side of the dates they will move. */
  dateFlexDays?: number
  /**
   * How this traveler wants to be helped, inferred from how they talk.
   *
   * `fast` — decisive; wants the answer, not the options. `explore` — browsing; wants to compare
   * before committing. `detailed` — planning properly; wants the depth.
   *
   * Recorded because it decays otherwise: someone who opened with "just book me something cheap"
   * was being asked to choose between four kinds of tour four turns later.
   */
  pace?: TripPace
  /** What sort of trip they want, in their own terms. Steers what is worth surfacing. */
  vibe?: TripVibe[]
}

export interface TripState {
  id: string
  meta: TripMeta
  flights: Flight[]
  stays: Stay[]
  days: Day[]
  estimatedTotal: number
  /**
   * What the traveler has recorded about booking each part, keyed by the bookable item's key.
   *
   * It lives on the trip rather than inside the booking screen so it survives closing that screen —
   * marking something booked and losing it on the next open is worse than not offering it.
   */
  bookings?: Record<string, 'not_booked' | 'booked' | 'confirmed'>
}
