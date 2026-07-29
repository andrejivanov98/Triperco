import type { TripState } from './types'
import { formatDateRange } from './dates'
import { primaryStayBookingLink } from './bookingLink'

export type BookingStatus = 'not_booked' | 'booked' | 'confirmed'

export interface BookableItem {
  /** Stable key: kind + the item's own id. */
  key: string
  kind: 'flight' | 'stay' | 'activity'
  title: string
  /** Provider the traveler completes the booking with. */
  partner: string
  bookUrl?: string
  price?: number
  /** "Aug 7–10 · 3 nights · 2 guests" style context. */
  detail?: string
  thumbnail?: string
  status: BookingStatus
}

export const BOOKING_LABEL: Record<BookingStatus, string> = {
  not_booked: 'Not booked',
  booked: 'Booked',
  confirmed: 'Confirmed',
}

function partnerFromUrl(url: string | undefined, fallback: string): string {
  if (!url) return fallback
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    // "booking.com" → "Booking.com"; "google.com" stays recognizable.
    return host.charAt(0).toUpperCase() + host.slice(1)
  } catch {
    return fallback
  }
}

/**
 * Everything in the trip the traveler still has to book, in trip order. We never book on their
 * behalf — each row points at the provider that does.
 */
export function bookableItems(trip: TripState): BookableItem[] {
  const items: BookableItem[] = []
  const range = formatDateRange(trip.meta.startDate, trip.meta.endDate)
  const travelers = trip.meta.travelers > 0 ? trip.meta.travelers : 1

  trip.flights.forEach((f, i) => {
    items.push({
      key: `flight:${f.id}`,
      kind: 'flight',
      title: `${f.from} → ${f.to}`,
      partner: f.airline ?? partnerFromUrl(f.bookUrl, 'the airline'),
      bookUrl: f.bookUrl || undefined,
      price: f.price * travelers,
      detail: [
        i === 0 ? 'Outbound' : 'Return',
        f.departDate,
        `${travelers} traveler${travelers === 1 ? '' : 's'}`,
      ]
        .filter(Boolean)
        .join(' · '),
      status: f.bookingStatus === 'booked' ? 'booked' : 'not_booked',
    })
  })

  for (const s of trip.stays) {
    /*
     * The provider's own link is an opaque redirect that drops the dates, landing the traveler on a
     * blank search at the exact moment they are ready to pay. Rebuild it with the property, their
     * dates and their party already applied.
     */
    const link = primaryStayBookingLink(s, trip.meta)
    items.push({
      key: `stay:${s.id}`,
      kind: 'stay',
      title: s.name,
      partner: link.provider,
      bookUrl: link.url || s.bookUrl || s.offers?.[0]?.url,
      price: s.totalPrice ?? s.pricePerNight * s.nights,
      detail: [
        s.kind === 'vacation_rental' ? 'Home' : s.hotelClass ?? 'Hotel',
        range,
        `${s.nights} night${s.nights === 1 ? '' : 's'}`,
        `${travelers} guest${travelers === 1 ? '' : 's'}`,
      ]
        .filter(Boolean)
        .join(' · '),
      thumbnail: s.photos[0],
      status: s.bookingStatus === 'booked' ? 'booked' : 'not_booked',
    })
  }

  trip.days.forEach((day, dayIndex) => {
    for (const item of day.items) {
      items.push({
        key: `activity:${item.placeId}:${dayIndex}`,
        kind: 'activity',
        title: item.name,
        partner: 'Google Maps',
        bookUrl: `https://www.google.com/maps/place/?q=place_id:${item.placeId}`,
        detail: day.date ?? `Day ${dayIndex + 1}`,
        status: 'not_booked',
      })
    }
  })

  return items
}

/** What the traveler still owes across everything bookable. */
export function bookingTotal(items: BookableItem[]): number {
  return items.reduce((sum, item) => sum + (item.price ?? 0), 0)
}

/** How far along the booking is — drives the summary header. */
export function bookingProgress(items: BookableItem[]): { done: number; total: number } {
  return {
    done: items.filter((i) => i.status !== 'not_booked').length,
    total: items.length,
  }
}
