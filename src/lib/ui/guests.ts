/** Who is travelling, as chosen in the landing composer. */
export interface Guests {
  rooms: number
  adults: number
  children: number
}

export const DEFAULT_GUESTS: Guests = { rooms: 1, adults: 1, children: 0 }

const LIMITS: Record<keyof Guests, { min: number; max: number }> = {
  rooms: { min: 1, max: 8 },
  adults: { min: 1, max: 16 },
  children: { min: 0, max: 10 },
}

export function stepGuests(guests: Guests, field: keyof Guests, delta: number): Guests {
  const { min, max } = LIMITS[field]
  const next = Math.min(max, Math.max(min, guests[field] + delta))
  return { ...guests, [field]: next }
}

export function canStep(guests: Guests, field: keyof Guests, delta: number): boolean {
  const { min, max } = LIMITS[field]
  const next = guests[field] + delta
  return next >= min && next <= max
}

/** "2 adults · 1 child · 1 room" — omits zero children, pluralizes, stays short. */
export function describeGuests(guests: Guests): string {
  const parts = [`${guests.adults} adult${guests.adults === 1 ? '' : 's'}`]
  if (guests.children > 0) {
    parts.push(`${guests.children} child${guests.children === 1 ? '' : 'ren'}`)
  }
  parts.push(`${guests.rooms} room${guests.rooms === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

export function isDefaultGuests(guests: Guests): boolean {
  return (
    guests.rooms === DEFAULT_GUESTS.rooms &&
    guests.adults === DEFAULT_GUESTS.adults &&
    guests.children === DEFAULT_GUESTS.children
  )
}

/** Total heads, which is what a hotel search means by "guests". */
export function totalTravelers(guests: Guests): number {
  return guests.adults + guests.children
}
