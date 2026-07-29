import type { Place } from '../trip/types'

/** What google_events actually returns. `date` carries no year, so we have to infer one. */
export interface RawEvent {
  position?: number
  title?: string
  link?: string
  date?: { day?: string; month?: string; when?: string; start_date?: string }
  duration?: string
  address?: string | string[]
  location?: string
  thumbnail?: string
  description?: string
  venue?: { name?: string; rating?: number; reviews?: number; link?: string }
  offers?: { seller?: string; link?: string; link_type?: string }[]
}

export interface RawEventsResponse {
  events?: RawEvent[]
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Turn "day 28, month Jul" into a real date. The provider omits the year, so take the next
 * occurrence — an event listed today is this year's, one listed for a month already past is next
 * year's. Anchored on `now` so it stays testable.
 */
export function resolveEventDate(
  day: string | undefined,
  month: string | undefined,
  now: Date = new Date(),
): string | undefined {
  const dayNumber = Number.parseInt((day ?? '').trim(), 10)
  const monthNumber = MONTHS[(month ?? '').trim().slice(0, 3).toLowerCase()]
  if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 31 || !monthNumber) return undefined

  const todayMonth = now.getUTCMonth() + 1
  const todayDay = now.getUTCDate()
  const past = monthNumber < todayMonth || (monthNumber === todayMonth && dayNumber < todayDay)
  const year = now.getUTCFullYear() + (past ? 1 : 0)
  return `${year}-${pad(monthNumber)}-${pad(dayNumber)}`
}

function address(value: RawEvent['address']): string | undefined {
  const text = Array.isArray(value) ? value.filter(Boolean).join(', ') : value
  return text?.trim() || undefined
}

/** A stable id: the provider gives no key, and the same event must not change identity per search. */
function eventId(event: RawEvent, date: string | undefined): string {
  const slug = (event.title ?? 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `evt-${date ?? 'undated'}-${slug}`
}

export function normalizeEvents(raw: RawEventsResponse, now: Date = new Date()): Place[] {
  return (raw.events ?? [])
    .filter((event) => (event.title ?? '').trim().length > 0)
    .map((event) => {
      const startDate = resolveEventDate(event.date?.day, event.date?.month, now)
      // "tickets" is the offer you can actually act on; the rest are resellers and blurb.
      const tickets = (event.offers ?? []).filter((o) => o.link)
      const primary = tickets.find((o) => /ticket/i.test(o.link_type ?? '')) ?? tickets[0]

      const place: Place = {
        id: eventId(event, startDate),
        name: (event.title ?? '').trim(),
        activityKind: 'event',
        photos: event.thumbnail ? [event.thumbnail] : [],
        reviewSnippets: [],
        sourceLinks: event.link ? { maps: event.link } : {},
      }

      if (startDate) place.startDate = startDate
      if (event.duration?.trim()) place.whenLabel = event.duration.trim()
      if (event.venue?.name?.trim()) place.venueName = event.venue.name.trim()
      if (event.location?.trim() && !place.venueName) place.venueName = event.location.trim()
      if (typeof event.venue?.rating === 'number') place.rating = event.venue.rating
      if (typeof event.venue?.reviews === 'number') place.reviewCount = event.venue.reviews
      const where = address(event.address)
      if (where) place.address = where
      if (event.description?.trim()) place.description = event.description.trim()
      if (primary?.link) place.ticketUrl = primary.link
      const sellers = [...new Set(tickets.map((o) => o.seller?.trim()).filter((s): s is string => !!s))]
      if (sellers.length > 0) place.ticketSellers = sellers.slice(0, 4)

      return place
    })
}
