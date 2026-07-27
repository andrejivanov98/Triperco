import type {
  NearbyPlace,
  RatingBucket,
  ReviewSnippet,
  ReviewTopic,
  Stay,
  StayOffer,
} from '../trip/types'

interface RawPrice {
  price?: string
  extracted_price?: number
}

interface RawOffer {
  source?: string
  logo?: string
  link?: string
  tracking_link?: string
  is_official?: boolean
  price_per_night?: RawPrice
  total_price?: RawPrice
}

interface RawNearby {
  name?: string
  category?: string
  rating?: number
  transportations?: { type?: string; duration?: string }[]
}

export interface RawHotelProperty {
  type?: string
  property_token?: string
  name?: string
  link?: string
  address?: string
  phone?: string
  check_in_time?: string
  check_out_time?: string
  hotel_class?: string
  description?: string
  deal?: string
  eco_certified?: boolean
  amenities?: string[]
  excluded_amenities?: string[]
  essential_info?: string[]
  rating?: number
  reviews?: number
  price_per_night?: RawPrice
  total_price?: RawPrice
  price_insights?: {
    lowest_price?: string
    price_level?: string
    typical_price_range?: { low_price?: string; high_price?: string }
  }
  reviews_histogram?: Record<string, number>
  reviews_breakdown?: {
    name?: string
    total_mentions?: number
    positive?: number
    neutral?: number
    negative?: number
  }[]
  review_results?: { reviews?: { username?: string; text?: string; rating?: number; date?: string }[] }
  location_rating?: number
  proximity_to_things_to_do_rating?: number
  proximity_to_transit_rating?: number
  airport_access_rating?: number
  images?: { thumbnail?: string; original?: string }[]
  nearby_places?: RawNearby[]
  featured_offers?: RawOffer[]
  all_offers?: RawOffer[]
  gps_coordinates?: { latitude: number; longitude: number }
}

export interface RawPropertyResponse {
  property?: RawHotelProperty
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toBuckets(histogram?: Record<string, number>): RatingBucket[] | undefined {
  if (!histogram) return undefined
  const buckets = Object.entries(histogram)
    .map(([stars, count]) => ({ stars: Number(stars), count }))
    .filter((b) => Number.isFinite(b.stars))
    .sort((a, b) => a.stars - b.stars)
  return buckets.length ? buckets : undefined
}

function toTopics(raw: RawHotelProperty['reviews_breakdown']): ReviewTopic[] | undefined {
  const topics = (raw ?? [])
    .filter((t): t is { name: string } & NonNullable<typeof t> => Boolean(t.name))
    .map((t) => ({
      name: t.name,
      positive: t.positive,
      negative: t.negative,
      neutral: t.neutral,
      total: t.total_mentions,
    }))
  return topics.length ? topics : undefined
}

function toReviews(raw: RawHotelProperty['review_results']): ReviewSnippet[] | undefined {
  const reviews = (raw?.reviews ?? [])
    .filter((r): r is { text: string } & NonNullable<typeof r> => Boolean(r.text))
    .map((r) => ({
      ...(r.username ? { author: r.username } : {}),
      ...(r.rating !== undefined ? { rating: r.rating } : {}),
      text: r.text,
      ...(r.date ? { date: r.date } : {}),
    }))
  return reviews.length ? reviews : undefined
}

function toNearby(raw?: RawNearby[]): NearbyPlace[] | undefined {
  const places = (raw ?? [])
    .filter((n): n is { name: string } & RawNearby => Boolean(n.name))
    .map((n) => {
      const t = n.transportations?.[0]
      const transit = t?.duration && t?.type ? `${t.duration} · ${t.type}` : t?.duration
      return {
        name: n.name,
        ...(transit ? { transit } : {}),
        ...(n.category ? { category: n.category } : {}),
        ...(n.rating !== undefined ? { rating: n.rating } : {}),
      }
    })
  return places.length ? places : undefined
}

/** Merge featured + all offers, dedupe by source, cheapest first. */
function toOffers(p: RawHotelProperty): StayOffer[] | undefined {
  const bySource = new Map<string, StayOffer>()
  for (const raw of [...(p.all_offers ?? []), ...(p.featured_offers ?? [])]) {
    if (!raw.source) continue
    const offer: StayOffer = {
      source: raw.source,
      ...(raw.logo ? { logo: raw.logo } : {}),
      ...(raw.link || raw.tracking_link ? { url: raw.link ?? raw.tracking_link } : {}),
      ...(raw.is_official ? { official: true } : {}),
      ...(raw.price_per_night?.extracted_price !== undefined
        ? { pricePerNight: raw.price_per_night.extracted_price }
        : {}),
      ...(raw.total_price?.extracted_price !== undefined
        ? { totalPrice: raw.total_price.extracted_price }
        : {}),
    }
    // One entry per source: the first wins, later ones only fill blanks
    // (featured offers carry logos that all_offers omits).
    const existing = bySource.get(raw.source)
    bySource.set(raw.source, existing ? { ...offer, ...existing } : offer)
  }
  const offers = [...bySource.values()].sort(
    (a, b) => (a.pricePerNight ?? Infinity) - (b.pricePerNight ?? Infinity),
  )
  return offers.length ? offers : undefined
}

/**
 * Normalize a `google_hotels_property` response into a Stay. This is the rich view: sub-ratings,
 * the review histogram, what reviewers discuss, and every place selling the room.
 */
export function normalizeHotelProperty(raw: RawPropertyResponse, nights: number): Stay | null {
  const p = raw.property
  if (!p?.name) return null

  const offers = toOffers(p)
  const official = offers?.find((o) => o.official)

  return {
    id: slugify(p.name),
    name: p.name,
    source: 'hotel',
    kind: p.type?.replace(/[\s_-]/g, '').toLowerCase() === 'vacationrental' ? 'vacation_rental' : 'hotel',
    coords: p.gps_coordinates
      ? { lat: p.gps_coordinates.latitude, lng: p.gps_coordinates.longitude }
      : undefined,
    rating: p.rating,
    reviewCount: p.reviews,
    pricePerNight: p.price_per_night?.extracted_price ?? 0,
    nights,
    totalPrice: p.total_price?.extracted_price,
    photos: (p.images ?? []).map((i) => i.original ?? i.thumbnail ?? '').filter(Boolean),
    bookUrl: official?.url ?? offers?.[0]?.url ?? p.link ?? '',
    propertyToken: p.property_token,
    hotelClass: p.hotel_class,
    description: p.description,
    address: p.address,
    phone: p.phone,
    checkInTime: p.check_in_time,
    checkOutTime: p.check_out_time,
    amenities: p.amenities,
    excludedAmenities: p.excluded_amenities,
    essentialInfo: p.essential_info,
    ratingsBreakdown: toBuckets(p.reviews_histogram),
    reviewTopics: toTopics(p.reviews_breakdown),
    reviewSnippets: toReviews(p.review_results),
    nearbyPlaces: toNearby(p.nearby_places),
    dealBadge: p.deal,
    ecoCertified: p.eco_certified,
    offers,
    priceInsight: p.price_insights
      ? {
          level: p.price_insights.price_level,
          lowest: p.price_insights.lowest_price,
          typicalLow: p.price_insights.typical_price_range?.low_price,
          typicalHigh: p.price_insights.typical_price_range?.high_price,
        }
      : undefined,
    locationRating: p.location_rating,
    thingsToDoRating: p.proximity_to_things_to_do_rating,
    transitRating: p.proximity_to_transit_rating,
    airportRating: p.airport_access_rating,
  }
}
