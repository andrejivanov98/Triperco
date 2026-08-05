import type { Flight, Stay, Place, TripState } from '@/lib/trip/types'
import type { ResultSet } from './results'
import { resultSetKey } from './results'
import { rankResults, MAX_CARDS } from './rank'

/**
 * A snapshot of what the traveler can actually see, sent with their message.
 *
 * Without this the agent only knows what it searched, so "the second one" or "is that one
 * quieter?" force it to ask — and asking is what makes a concierge feel like a form.
 */
export interface ContextHint {
  hintType:
    | 'flight_results'
    | 'stay_results'
    | 'place_results'
    | 'flight_detail'
    | 'stay_detail'
    | 'place_detail'
    | 'plan'
  /** Plain English, addressed to the model. */
  description: string
  /** JSON payload, already capped. */
  content: string
  /** When the snapshot was taken. Prices in it are stale the moment it is written. */
  capturedAt: string
}

/**
 * Taken from MAX_CARDS rather than repeated, so "the second one" always means the second card the
 * traveler can see. When these two drifted apart, the positions in the hint stopped matching.
 */
const MAX_ITEMS = MAX_CARDS
const MAX_AMENITIES = 8
/** Only the newest set per kind is what they're looking at; older ones are scrolled away. */
const MAX_SETS = 3
const TEXT_LIMIT = 700
/** A hint past this is costing more context than it earns. */
const MAX_CONTENT_CHARS = 4000

function str(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : undefined
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function bool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function list(values: unknown, max: number): string[] | undefined {
  if (!Array.isArray(values)) return undefined
  const out = [...new Set(values.map(str).filter((v): v is string => v !== undefined))].slice(0, max)
  return out.length > 0 ? out : undefined
}

/** Truncate on a word boundary so the model never reads half a word as a fact. */
function clip(value: unknown, limit = TEXT_LIMIT): string | undefined {
  const text = str(value)
  if (!text || text.length <= limit) return text
  const cut = text.slice(0, limit)
  const space = cut.lastIndexOf(' ')
  return (space > limit * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…'
}

/** Drop absent keys, so a sparse provider payload doesn't fill the context with nulls. */
function compact(entries: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(entries).filter(([, v]) => v !== undefined))
}

/** The first line of an address is the bit a traveler recognises. */
function area(address: unknown): string | undefined {
  return str(address)?.split(',')[0]?.trim() || undefined
}

function flightSummary(flight: Flight, position: number, badges: string[]) {
  return compact({
    position,
    id: str(flight.id),
    airline: str(flight.airline),
    from: str(flight.from),
    to: str(flight.to),
    departs: str(flight.departTime),
    arrives: str(flight.arriveTime),
    depart_date: str(flight.departDate),
    duration_minutes: num(flight.durationMinutes),
    stops: num(flight.stops),
    price_per_traveler: num(flight.price),
    direction: str(flight.direction),
    trip_type: str(flight.tripType),
    includes_return_leg: flight.returnLeg ? true : undefined,
    badges: badges.length > 0 ? badges : undefined,
  })
}

function staySummary(stay: Stay, position: number, badges: string[]) {
  return compact({
    position,
    id: str(stay.id),
    name: str(stay.name),
    type: stay.kind === 'vacation_rental' ? 'entire place' : (str(stay.hotelClass) ?? 'hotel'),
    price_per_night: num(stay.pricePerNight),
    total_price: num(stay.totalPrice),
    nights: num(stay.nights),
    rating: num(stay.rating),
    review_count: num(stay.reviewCount),
    area: area(stay.address),
    amenities: list(stay.amenities, MAX_AMENITIES),
    check_in: str(stay.checkInTime),
    deal: str(stay.dealBadge),
    badges: badges.length > 0 ? badges : undefined,
  })
}

function placeSummary(place: Place, position: number, badges: string[]) {
  return compact({
    position,
    id: str(place.id),
    name: str(place.name),
    category: str(place.category),
    rating: num(place.rating),
    review_count: num(place.reviewCount),
    price_range: str(place.priceRange),
    open_now: bool(place.openNow),
    hours: str(place.hours),
    area: area(place.address),
    summary: clip(place.description, 240),
    badges: badges.length > 0 ? badges : undefined,
  })
}

/** The open panel gets more room than a card, because it is the thing being discussed. */
function flightDetail(flight: Flight) {
  return compact({
    id: str(flight.id),
    airline: str(flight.airline),
    from: str(flight.from),
    to: str(flight.to),
    departs: str(flight.departTime),
    arrives: str(flight.arriveTime),
    depart_date: str(flight.departDate),
    arrive_date: str(flight.arriveDate),
    duration_minutes: num(flight.durationMinutes),
    stops: num(flight.stops),
    price_per_traveler: num(flight.price),
    direction: str(flight.direction),
    trip_type: str(flight.tripType),
    cabin: str(flight.segments?.find((s) => s.cabin)?.cabin),
    layovers: list(
      flight.layovers?.map((l) => [str(l.code), l.durationMinutes ? `${l.durationMinutes} min` : undefined]
        .filter(Boolean)
        .join(' ')),
      4,
    ),
    notes: list(flight.extensions, 4),
    return_leg: flight.returnLeg
      ? compact({
          departs: str(flight.returnLeg.departTime),
          arrives: str(flight.returnLeg.arriveTime),
          depart_date: str(flight.returnLeg.departDate),
          stops: num(flight.returnLeg.stops),
          duration_minutes: num(flight.returnLeg.durationMinutes),
        })
      : undefined,
  })
}

function stayDetail(stay: Stay) {
  return compact({
    id: str(stay.id),
    name: str(stay.name),
    type: stay.kind === 'vacation_rental' ? 'entire place' : (str(stay.hotelClass) ?? 'hotel'),
    price_per_night: num(stay.pricePerNight),
    total_price: num(stay.totalPrice),
    nights: num(stay.nights),
    rating: num(stay.rating),
    review_count: num(stay.reviewCount),
    address: str(stay.address),
    description: clip(stay.description),
    amenities: list(stay.amenities, MAX_AMENITIES),
    missing_amenities: list(stay.excludedAmenities, 4),
    essentials: list(stay.essentialInfo, 4),
    check_in: str(stay.checkInTime),
    check_out: str(stay.checkOutTime),
    location_rating: num(stay.locationRating),
    review_topics: list(
      stay.reviewTopics?.map((t) => str(t.name)),
      6,
    ),
    offer_count: num(stay.offers?.length),
    deal: str(stay.dealBadge),
  })
}

function placeDetail(place: Place) {
  return compact({
    id: str(place.id),
    name: str(place.name),
    category: str(place.category),
    rating: num(place.rating),
    review_count: num(place.reviewCount),
    price_range: str(place.priceRange),
    open_now: bool(place.openNow),
    permanently_closed: bool(place.permanentlyClosed),
    hours: str(place.hours),
    address: str(place.address),
    description: clip(place.description),
    service_options: list(place.serviceOptions, 6),
  })
}

/**
 * The newest set per question, in the order the questions first appeared. An older set answering
 * the same question has collapsed on screen, so telling the model it is visible would be a lie.
 */
export function visibleSets(sets: ResultSet[]): ResultSet[] {
  const latest = new Map<string, ResultSet>()
  for (const set of sets) latest.set(resultSetKey(set), set)
  return [...latest.values()].slice(-MAX_SETS)
}

function setHeader(set: ResultSet): { hintType: ContextHint['hintType']; description: string } {
  const snapshot = ' Prices are a snapshot of the UI taken at capturedAt, not a live quote.'
  if (set.kind === 'flights') {
    const noun =
      set.flightType === 'round_trip'
        ? 'Round-trip flight options'
        : set.flightType === 'return'
          ? 'Return flight options (the way home)'
          : 'One-way flight options'
    return {
      hintType: 'flight_results',
      description: `${noun} on screen for the traveler right now, in the order shown.${snapshot}`,
    }
  }
  if (set.kind === 'stays') {
    return {
      hintType: 'stay_results',
      description: `Places to stay on screen for the traveler right now, in the order shown.${snapshot}`,
    }
  }
  return {
    hintType: 'place_results',
    description: 'Things to do on screen for the traveler right now, in the order shown.',
  }
}

/** Trim from the end until the payload is affordable. Never drops the first item. */
function fitContent(items: Record<string, unknown>[], envelope: (kept: Record<string, unknown>[]) => object): string {
  let kept = items
  let content = JSON.stringify(envelope(kept))
  while (content.length > MAX_CONTENT_CHARS && kept.length > 1) {
    kept = kept.slice(0, -1)
    content = JSON.stringify(envelope(kept))
  }
  return content
}

function resultHint(set: ResultSet, openId: string | undefined, capturedAt: string): ContextHint | null {
  const ranked = rankResults(set)
  if (ranked.length === 0) return null

  const items = ranked.slice(0, MAX_ITEMS).map((entry, i) => {
    const position = i + 1
    const summary =
      entry.kind === 'flights'
        ? flightSummary(entry.item, position, entry.badges)
        : entry.kind === 'stays'
          ? staySummary(entry.item, position, entry.badges)
          : placeSummary(entry.item, position, entry.badges)
    // Mark the one they have open, so a bare "this one" resolves without a guess.
    return entry.item.id === openId ? { ...summary, open_in_panel: true } : summary
  })

  const { hintType, description } = setHeader(set)
  const hasMore = set.items.length > ranked.length
  const content = fitContent(items, (kept) =>
    compact({
      query: str(set.query),
      showing: kept.length,
      has_more_results: hasMore || undefined,
      items: kept,
    }),
  )

  return { hintType, description, content, capturedAt }
}

function detailHint(
  open: { kind: ResultSet['kind']; item: Flight | Stay | Place },
  capturedAt: string,
): ContextHint {
  if (open.kind === 'flights') {
    return {
      hintType: 'flight_detail',
      description: 'The flight whose full details the traveler has open right now.',
      content: JSON.stringify(flightDetail(open.item as Flight)),
      capturedAt,
    }
  }
  if (open.kind === 'stays') {
    return {
      hintType: 'stay_detail',
      description:
        'The stay whose full details the traveler has open right now. Prices are a snapshot of the UI taken at capturedAt.',
      content: JSON.stringify(stayDetail(open.item as Stay)),
      capturedAt,
    }
  }
  return {
    hintType: 'place_detail',
    description: 'The place whose full details the traveler has open right now.',
    content: JSON.stringify(placeDetail(open.item as Place)),
    capturedAt,
  }
}

/**
 * What the traveler has actually put in the plan, and what is therefore still missing.
 *
 * This is the hint that makes "you have flights — shall we sort the hotel?" possible at all. The
 * trip was already sent to the server and sat in the tool state, but nothing ever described it to
 * the model, so the agent could not tell an empty plan from a finished one and had no way to know
 * which step to offer next.
 */
function planHint(trip: TripState, capturedAt: string): ContextHint | null {
  const activities = trip.days.reduce((sum, day) => sum + day.items.length, 0)
  if (trip.flights.length === 0 && trip.stays.length === 0 && activities === 0) return null

  const missing = [
    trip.flights.length === 0 ? 'transport' : undefined,
    trip.stays.length === 0 ? 'somewhere to stay' : undefined,
    activities === 0 ? 'things to do' : undefined,
  ].filter((part): part is string => part !== undefined)

  const content = JSON.stringify(
    compact({
      flights: trip.flights.length || undefined,
      stays: trip.stays.length || undefined,
      things_to_do: activities || undefined,
      // Named plainly so the agent can offer the next step without working it out.
      still_missing: missing.length > 0 ? missing : undefined,
      stay_names: list(trip.stays.map((s) => s.name), 3),
    }),
  )

  return {
    hintType: 'plan',
    description:
      'What the traveler has already added to their plan, and what it is still missing. They put ' +
      'these there themselves. Offer the missing pieces as the next step rather than re-offering ' +
      'what is already in.',
    content,
    capturedAt,
  }
}

export interface VisibleContext {
  /** Result sets rendered in the thread, oldest first. */
  sets?: ResultSet[]
  /** Whichever detail panel is open, if any. */
  open?: { kind: ResultSet['kind']; item: Flight | Stay | Place } | null
  /** The plan as it stands, so the agent knows what is already settled. */
  trip?: TripState
  capturedAt?: string
}

/**
 * Build the hints for one message. Returns [] when there is nothing on screen worth reporting,
 * so an opening message never carries an empty shell of context.
 *
 * The open item is always represented: it appears flagged inside its result set when it is one of
 * the visible cards, and it always gets its own fuller detail hint. So the thing the traveler is
 * definitely talking about can never be the thing that got trimmed.
 */
export function buildContextHints(ctx: VisibleContext = {}): ContextHint[] {
  const capturedAt = ctx.capturedAt ?? new Date().toISOString()
  const openId = ctx.open?.item.id
  const hints: ContextHint[] = []

  for (const set of visibleSets(ctx.sets ?? [])) {
    const hint = resultHint(set, openId, capturedAt)
    if (hint) hints.push(hint)
  }
  if (ctx.open) hints.push(detailHint(ctx.open, capturedAt))
  // Last, so it reads as the standing state after the transient screen contents.
  if (ctx.trip) {
    const plan = planHint(ctx.trip, capturedAt)
    if (plan) hints.push(plan)
  }

  return hints
}

/** Render hints as the system-prompt section the agent reads. Empty in, empty out. */
export function formatContextHints(hints: ContextHint[]): string {
  if (hints.length === 0) return ''
  return [
    'WHAT THE TRAVELER IS LOOKING AT RIGHT NOW',
    'This is the screen as they sent their message. Use it to resolve what they point at —',
    '"the second one", "that one", "the cheaper room" — instead of asking them to repeat it.',
    'Do not search again just to find out what is on screen: it is already below.',
    'Never quote these prices as current; they are a captured snapshot, and the provider site is',
    'the only live source.',
    '',
    ...hints.map((h) => `[${h.hintType}] ${h.description} (capturedAt ${h.capturedAt})\n${h.content}`),
  ].join('\n')
}
