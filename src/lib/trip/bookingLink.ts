import type { Stay, TripMeta } from './types'

/**
 * The provider hands us an opaque tracking link that does not carry the dates. Following it drops
 * the traveler on a bare search page where they have to re-enter everything they already told us —
 * which is the worst moment in the whole flow to ask someone to start again.
 *
 * So we build the link ourselves: the property name, their dates and their party, pre-filled on the
 * provider's own search. It lands on results already filtered, with the property at the top.
 *
 * We only do this for providers whose search parameters are stable and public. For anything else we
 * send them to Google Hotels with the dates filled in rather than invent parameters that would be
 * silently ignored.
 */
export interface BookingContext {
  checkIn?: string
  checkOut?: string
  adults?: number
  children?: number
  rooms?: number
  /** The city. Without it "Doroma House" matches half of Europe. */
  city?: string
}

export interface BookingLink {
  url: string
  /** Who they will be booking with. */
  provider: string
  /** True when the dates made it into the link. */
  dated: boolean
}

function ctxFromMeta(
  meta: Pick<TripMeta, 'startDate' | 'endDate' | 'adults' | 'children' | 'rooms' | 'travelers' | 'destination'>,
): BookingContext {
  return {
    checkIn: meta.startDate,
    checkOut: meta.endDate,
    adults: meta.adults ?? meta.travelers,
    children: meta.children,
    rooms: meta.rooms,
    city: meta.destination,
  }
}

/** "Doroma House, Turin" — the name alone is not unique enough to land on the right property. */
function searchQuery(stay: Stay, context: BookingContext): string {
  const name = stay.name.trim()
  const city = context.city?.trim()
  if (!city) return name
  return name.toLowerCase().includes(city.toLowerCase()) ? name : `${name}, ${city}`
}

function isDate(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function positive(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined
}

/** The host a URL points at, lowercased and without www. */
function hostOf(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

type Builder = (name: string, ctx: BookingContext) => string

const BOOKING_COM: Builder = (name, ctx) => {
  const url = new URL('https://www.booking.com/searchresults.html')
  url.searchParams.set('ss', name)
  if (isDate(ctx.checkIn)) url.searchParams.set('checkin', ctx.checkIn)
  if (isDate(ctx.checkOut)) url.searchParams.set('checkout', ctx.checkOut)
  const adults = positive(ctx.adults)
  if (adults) url.searchParams.set('group_adults', String(adults))
  const children = positive(ctx.children)
  if (children) url.searchParams.set('group_children', String(children))
  url.searchParams.set('no_rooms', String(positive(ctx.rooms) ?? 1))
  return url.toString()
}

const AIRBNB: Builder = (name, ctx) => {
  const url = new URL(`https://www.airbnb.com/s/${encodeURIComponent(name)}/homes`)
  if (isDate(ctx.checkIn)) url.searchParams.set('checkin', ctx.checkIn)
  if (isDate(ctx.checkOut)) url.searchParams.set('checkout', ctx.checkOut)
  const adults = positive(ctx.adults)
  if (adults) url.searchParams.set('adults', String(adults))
  const children = positive(ctx.children)
  if (children) url.searchParams.set('children', String(children))
  return url.toString()
}

/** Expedia and Hotels.com share a search surface and its parameter names. */
function expediaFamily(origin: string): Builder {
  return (name, ctx) => {
    const url = new URL(`${origin}/Hotel-Search`)
    url.searchParams.set('destination', name)
    if (isDate(ctx.checkIn)) url.searchParams.set('startDate', ctx.checkIn)
    if (isDate(ctx.checkOut)) url.searchParams.set('endDate', ctx.checkOut)
    const adults = positive(ctx.adults)
    if (adults) url.searchParams.set('adults', String(adults))
    const rooms = positive(ctx.rooms)
    if (rooms) url.searchParams.set('rooms', String(rooms))
    return url.toString()
  }
}

/** The fallback: Google's own hotel search, which every property is already in. */
const GOOGLE_HOTELS: Builder = (name, ctx) => {
  const url = new URL('https://www.google.com/travel/search')
  url.searchParams.set('q', name)
  if (isDate(ctx.checkIn)) url.searchParams.set('checkin', ctx.checkIn)
  if (isDate(ctx.checkOut)) url.searchParams.set('checkout', ctx.checkOut)
  return url.toString()
}

const BUILDERS: { match: RegExp; provider: string; build: Builder }[] = [
  { match: /booking\.com|^booking$/, provider: 'Booking.com', build: BOOKING_COM },
  { match: /airbnb/, provider: 'Airbnb', build: AIRBNB },
  { match: /hotels\.com/, provider: 'Hotels.com', build: expediaFamily('https://www.hotels.com') },
  { match: /expedia/, provider: 'Expedia', build: expediaFamily('https://www.expedia.com') },
]

/**
 * Who is selling this.
 *
 * The provider's name is checked first and the URL only as a fallback: the URL is usually an opaque
 * tracking redirect on a host nobody recognises, so trusting it would send an Airbnb listing to a
 * generic search.
 */
function findBuilder(source: string | undefined, url: string | undefined) {
  const name = (source ?? '').trim().toLowerCase()
  if (name) {
    const bySource = BUILDERS.find((b) => b.match.test(name))
    if (bySource) return bySource
  }
  const host = hostOf(url)
  return host ? BUILDERS.find((b) => b.match.test(host)) : undefined
}

/**
 * A link that arrives with the dates already applied.
 *
 * `source` is the provider name from the offer; `originalUrl` is whatever the provider gave us,
 * used only to work out who it points at.
 */
export function stayBookingLink(
  stay: Stay,
  context: BookingContext,
  source?: string,
  originalUrl?: string,
): BookingLink {
  const query = searchQuery(stay, context)
  const known = findBuilder(source, originalUrl)
  const dated = isDate(context.checkIn) && isDate(context.checkOut)

  if (!stay.name.trim()) {
    // Nothing to search for — the provider's own link is still better than nothing.
    return { url: originalUrl ?? '', provider: source ?? 'the provider', dated: false }
  }

  if (known) return { url: known.build(query, context), provider: known.provider, dated }
  return { url: GOOGLE_HOTELS(query, context), provider: 'Google Hotels', dated }
}

/**
 * The one button that should say "Book this stay".
 *
 * The provider gives us no offer link with the dates in it — for most properties it gives us no
 * offer at all — so there is no such thing as a true deep link to the exact room here. The most
 * reliable thing we can build is the property's own Google Hotels page for those exact dates, which
 * lists every provider's price for that stay. One click from there carries the dates through.
 *
 * A named provider is only preferred when we know its search parameters AND the property is a
 * hotel; holiday rentals have long descriptive names that provider search boxes handle badly.
 */
export function primaryStayBookingLink(
  stay: Stay,
  meta: Pick<TripMeta, 'startDate' | 'endDate' | 'adults' | 'children' | 'rooms' | 'travelers' | 'destination'>,
): BookingLink {
  // The property's own site first, then whoever else is selling it; Google Hotels if nobody is.
  const official = stay.offers?.find((o) => o.official) ?? stay.offers?.[0]
  return stayBookingLink(stay, ctxFromMeta(meta), official?.source, official?.url ?? stay.bookUrl)
}

/** The same thing, taking the dates straight off the trip. */
export function stayBookingLinkFromTrip(
  stay: Stay,
  meta: Pick<
    TripMeta,
    'startDate' | 'endDate' | 'adults' | 'children' | 'rooms' | 'travelers' | 'destination'
  >,
  source?: string,
  originalUrl?: string,
): BookingLink {
  return stayBookingLink(stay, ctxFromMeta(meta), source, originalUrl)
}
