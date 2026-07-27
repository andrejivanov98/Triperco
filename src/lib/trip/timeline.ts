import type { TripState, Flight, Stay } from './types'
import { enumerateDates, formatDayLabel, formatDateRange } from './dates'
import { formatDuration } from '../ui/format'

export type TimelineItemKind = 'flight' | 'stay' | 'activity'
export type AddSlot = 'flights' | 'return-flight' | 'stays' | 'activities'

export interface TimelineItem {
  kind: TimelineItemKind
  id: string
  title: string
  subtitle?: string
  timeLabel?: string
  dateLabel?: string
  price?: number
  priceUnit?: 'total' | 'night'
  thumbnail?: string
  bookUrl?: string
  bookLabel?: string
  bookingStatus: 'not_booked' | 'booked'
  /** Which day an activity sits on, so it can be removed from the right one. */
  dayIndex?: number
  /** Longer text for the expanded card. */
  description?: string
  rating?: number
  reviewCount?: number
}

export interface TimelineGroup {
  label?: string
  items: TimelineItem[]
  addSlots: AddSlot[]
}

export interface Timeline {
  headerLabel: string
  groups: TimelineGroup[]
}

function flightItem(f: Flight): TimelineItem {
  const stops = f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`
  const times =
    f.departTime && f.arriveTime ? `${f.departTime} – ${f.arriveTime}` : f.departTime
  return {
    kind: 'flight',
    id: f.id,
    title: `${f.from} → ${f.to}`,
    subtitle: [f.airline, stops].filter(Boolean).join(' · '),
    timeLabel: times,
    price: f.price,
    priceUnit: 'total',
    bookUrl: f.bookUrl,
    bookLabel: f.airline ? `Book on ${f.airline}` : 'Book flight',
    bookingStatus: f.bookingStatus ?? 'not_booked',
  }
}

function stayItem(s: Stay): TimelineItem {
  return {
    kind: 'stay',
    id: s.id,
    title: s.name,
    subtitle: s.kind === 'vacation_rental' ? 'Home' : s.hotelClass ?? (s.source === 'airbnb' ? 'Home' : 'Hotel'),
    price: s.totalPrice ?? s.pricePerNight * s.nights,
    priceUnit: 'total',
    thumbnail: s.photos[0],
    bookUrl: s.bookUrl,
    bookLabel: s.source === 'airbnb' ? 'Book on Airbnb' : 'Book stay',
    bookingStatus: s.bookingStatus ?? 'not_booked',
    description: s.description,
    rating: s.rating,
    reviewCount: s.reviewCount,
  }
}

export function buildTimeline(trip: TripState): Timeline {
  const { meta, flights, stays, days } = trip
  const dates = enumerateDates(meta.startDate, meta.endDate)

  const range = formatDateRange(meta.startDate, meta.endDate)
  const headerLabel = range
    ? `${meta.destination ?? 'Your trip'} · ${range}`
    : meta.destination ?? 'Your trip'

  const groups: TimelineGroup[] = []

  const activityItems = (dayIndex: number): TimelineItem[] =>
    (days[dayIndex]?.items ?? []).map((it) => ({
      kind: 'activity' as const,
      id: it.placeId,
      title: it.name,
      subtitle: it.note ?? it.category,
      timeLabel: formatDuration(it.durationMinutes),
      price: it.price,
      priceUnit: it.price !== undefined ? ('total' as const) : undefined,
      thumbnail: it.thumbnail,
      rating: it.rating,
      reviewCount: it.reviewCount,
      bookUrl: it.bookUrl,
      bookLabel: 'Open in Maps',
      bookingStatus: 'not_booked' as const,
      dayIndex,
    }))

  // --- Arrival day: getting there, where you sleep, then what you do ---
  const arrival: TimelineGroup = {
    label: dates.length ? formatDayLabel(dates[0]) : undefined,
    items: [],
    addSlots: [],
  }
  if (flights[0]) arrival.items.push(flightItem(flights[0]))
  else arrival.addSlots.push('flights')

  if (stays.length > 0) for (const s of stays) arrival.items.push(stayItem(s))
  else arrival.addSlots.push('stays')

  arrival.items.push(...activityItems(0))
  arrival.addSlots.push('activities')
  groups.push(arrival)

  // --- One group per remaining day, so every day can be filled ---
  // With dates we know exactly how many days there are; without them, only days that hold something.
  const dayCount = dates.length > 0 ? dates.length : days.length
  for (let i = 1; i < dayCount; i++) {
    const items = activityItems(i)
    if (dates.length === 0 && items.length === 0) continue
    groups.push({
      label: dates[i] ? formatDayLabel(dates[i]) : days[i]?.date ? formatDayLabel(days[i].date!) : `Day ${i + 1}`,
      items,
      addSlots: ['activities'],
    })
  }

  // Any activities parked past the known day count still need somewhere to show.
  for (let i = dayCount; i < days.length; i++) {
    const items = activityItems(i)
    if (items.length === 0) continue
    groups.push({ label: days[i].date ? formatDayLabel(days[i].date!) : `Day ${i + 1}`, items, addSlots: [] })
  }

  // --- Getting home ---
  const returnGroup: TimelineGroup = {
    label: dates.length ? formatDayLabel(dates[dates.length - 1]) : 'Return',
    items: [],
    addSlots: [],
  }
  if (flights[1]) returnGroup.items.push(flightItem(flights[1]))
  // Only ask for a return once there's an outbound flight to return from.
  else if (flights[0]) returnGroup.addSlots.push('return-flight')

  if (returnGroup.items.length > 0 || returnGroup.addSlots.length > 0) groups.push(returnGroup)

  return { headerLabel, groups }
}
