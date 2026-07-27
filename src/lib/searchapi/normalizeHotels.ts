import type { NearbyPlace, RatingBucket, ReviewSnippet, ReviewTopic, Stay } from '../trip/types'

interface RawPrice {
  price?: string
  extracted_price?: number
}

interface RawNearby {
  name?: string
  transportations?: { type?: string; duration?: string }[]
}

interface RawUserReview {
  user?: { name?: string }
  rating?: number
  snippet?: string
  text?: string
  date?: string
}

export interface RawProperty {
  name: string
  type?: string
  property_token?: string
  description?: string
  address?: string
  check_in_time?: string
  check_out_time?: string
  price_per_night?: RawPrice
  total_price?: RawPrice
  rating?: number
  overall_rating?: number
  reviews?: number
  gps_coordinates?: { latitude: number; longitude: number }
  images?: { thumbnail?: string; original?: string }[]
  link?: string
  hotel_class?: string
  deal?: string
  eco_certified?: boolean
  amenities?: string[]
  excluded_amenities?: string[]
  essential_info?: string[]
  ratings?: { stars?: number; count?: number }[]
  reviews_breakdown?: {
    name?: string
    positive?: number
    negative?: number
    neutral?: number
    total_mentioned?: number
  }[]
  nearby_places?: RawNearby[]
  user_reviews?: RawUserReview[]
}

export interface RawHotelsResponse {
  properties?: RawProperty[]
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** "vacation rental" / "vacation_rental" → a whole place; anything else → a hotel room. */
function propertyKind(type?: string): 'hotel' | 'vacation_rental' {
  return type?.replace(/[\s_-]/g, '').toLowerCase() === 'vacationrental'
    ? 'vacation_rental'
    : 'hotel'
}

function nightlyRate(p: RawProperty, nights: number): number {
  const nightly = p.price_per_night?.extracted_price
  if (nightly !== undefined) return nightly
  const total = p.total_price?.extracted_price
  if (total !== undefined && nights > 0) return Math.round(total / nights)
  return 0
}

function toRatingBuckets(raw: RawProperty['ratings']): RatingBucket[] | undefined {
  const buckets = (raw ?? [])
    .filter((r): r is { stars: number; count: number } => r.stars !== undefined && r.count !== undefined)
    .map((r) => ({ stars: r.stars, count: r.count }))
  return buckets.length ? buckets : undefined
}

function toReviewTopics(raw: RawProperty['reviews_breakdown']): ReviewTopic[] | undefined {
  const topics = (raw ?? [])
    .filter((t): t is { name: string } & typeof t => Boolean(t.name))
    .map((t) => ({
      name: t.name,
      positive: t.positive,
      negative: t.negative,
      neutral: t.neutral,
      total: t.total_mentioned,
    }))
  return topics.length ? topics : undefined
}

function toNearby(raw: RawNearby[] | undefined): NearbyPlace[] | undefined {
  const places = (raw ?? [])
    .filter((n): n is { name: string } & RawNearby => Boolean(n.name))
    .map((n) => {
      const t = n.transportations?.[0]
      const transit = t?.duration && t?.type ? `${t.duration} · ${t.type}` : t?.duration
      return { name: n.name, ...(transit ? { transit } : {}) }
    })
  return places.length ? places : undefined
}

function toReviews(raw: RawUserReview[] | undefined): ReviewSnippet[] | undefined {
  const reviews = (raw ?? [])
    .map((r): ReviewSnippet | null => {
      const text = r.snippet ?? r.text
      if (!text) return null
      return {
        ...(r.user?.name ? { author: r.user.name } : {}),
        ...(r.rating !== undefined ? { rating: r.rating } : {}),
        text,
        ...(r.date ? { date: r.date } : {}),
      }
    })
    .filter((r): r is ReviewSnippet => r !== null)
  return reviews.length ? reviews : undefined
}

export function normalizeHotels(raw: RawHotelsResponse, nights: number): Stay[] {
  return (raw.properties ?? []).map((p, i) => ({
    id: `${slugify(p.name)}-${i}`,
    name: p.name,
    source: 'hotel' as const,
    kind: propertyKind(p.type),
    coords: p.gps_coordinates
      ? { lat: p.gps_coordinates.latitude, lng: p.gps_coordinates.longitude }
      : undefined,
    rating: p.rating ?? p.overall_rating,
    reviewCount: p.reviews,
    pricePerNight: nightlyRate(p, nights),
    nights,
    totalPrice: p.total_price?.extracted_price,
    photos: (p.images ?? []).map((img) => img.original ?? img.thumbnail ?? '').filter(Boolean),
    bookUrl: p.link ?? '',
    propertyToken: p.property_token,
    hotelClass: p.hotel_class,
    description: p.description,
    address: p.address,
    checkInTime: p.check_in_time,
    checkOutTime: p.check_out_time,
    amenities: p.amenities,
    excludedAmenities: p.excluded_amenities,
    essentialInfo: p.essential_info,
    ratingsBreakdown: toRatingBuckets(p.ratings),
    reviewTopics: toReviewTopics(p.reviews_breakdown),
    reviewSnippets: toReviews(p.user_reviews),
    nearbyPlaces: toNearby(p.nearby_places),
    dealBadge: p.deal,
    ecoCertified: p.eco_certified,
  }))
}
