import type { TripState, Flight, Stay } from './types'
import { enumerateDates, formatDayLabel, formatDateRange } from './dates'

export type TimelineItemKind = 'flight' | 'stay' | 'activity'
export type AddSlot = 'flights' | 'activities'

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
    subtitle: s.source === 'airbnb' ? 'Home' : 'Hotel',
    price: s.pricePerNight * s.nights,
    priceUnit: 'total',
    thumbnail: s.photos[0],
    bookUrl: s.bookUrl,
    bookLabel: s.source === 'airbnb' ? 'Book on Airbnb' : 'Book stay',
    bookingStatus: s.bookingStatus ?? 'not_booked',
  }
}

export function buildTimeline(trip: TripState): Timeline {
  const { meta, flights, stays, days } = trip
  const dates = enumerateDates(meta.startDate, meta.endDate)

  const range = formatDateRange(meta.startDate, meta.endDate)
  const headerLabel = range
    ? `${meta.destination ?? 'Your trip'} · ${range}`
    : meta.destination ?? 'Your trip'

  const hasActivities = days.some((d) => d.items.length > 0)
  const groups: TimelineGroup[] = []

  // --- Arrival group ---
  const arrival: TimelineGroup = {
    label: dates.length ? formatDayLabel(dates[0]) : undefined,
    items: [],
    addSlots: [],
  }
  if (flights[0]) arrival.items.push(flightItem(flights[0]))
  else arrival.addSlots.push('flights')
  for (const s of stays) arrival.items.push(stayItem(s))
  if (!hasActivities) arrival.addSlots.push('activities')
  groups.push(arrival)

  // --- Activity day groups ---
  days.forEach((d, i) => {
    if (d.items.length === 0) return
    groups.push({
      label: d.date ? formatDayLabel(d.date) : `Day ${i + 1}`,
      items: d.items.map((it) => ({
        kind: 'activity' as const,
        id: it.placeId,
        title: it.name,
        subtitle: it.note,
        bookingStatus: 'not_booked' as const,
      })),
      addSlots: [],
    })
  })

  // --- Return group (only when a second flight exists) ---
  if (flights[1]) {
    groups.push({
      label: dates.length ? formatDayLabel(dates[dates.length - 1]) : 'Return',
      items: [flightItem(flights[1])],
      addSlots: [],
    })
  }

  return { headerLabel, groups }
}
