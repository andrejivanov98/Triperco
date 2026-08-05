import type { Coords } from './types'

/**
 * Links that work from a phone on the day.
 *
 * The summary is read while travelling, standing outside somewhere with one hand free. An address as
 * plain text has to be selected, copied and pasted into another app; the same address as a link is
 * one tap to walking directions. That is the whole difference between a document and a useful one.
 */

/** Coordinates beat a name: two hotels share a name, a lat/lng is unambiguous. */
function target(place: { name?: string; address?: string; coords?: Coords }): string {
  if (place.coords) return `${place.coords.lat},${place.coords.lng}`
  return [place.name, place.address].filter(Boolean).join(', ')
}

/** Turn-by-turn directions to somewhere, from wherever the reader happens to be. */
export function directionsUrl(place: { name?: string; address?: string; coords?: Coords }): string | undefined {
  const destination = target(place)
  if (!destination) return undefined
  const params = new URLSearchParams({ api: '1', destination })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** The place itself on a map — hours, photos, phone number, reviews. */
export function placeUrl(place: {
  name?: string
  address?: string
  coords?: Coords
  placeId?: string
}): string | undefined {
  if (place.placeId) return `https://www.google.com/maps/place/?q=place_id:${place.placeId}`
  const query = target(place)
  if (!query) return undefined
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query }).toString()}`
}

/** A phone number as something to press, not to read out. */
export function telUrl(phone: string | undefined): string | undefined {
  const digits = phone?.replace(/[^\d+]/g, '')
  return digits && digits.length >= 5 ? `tel:${digits}` : undefined
}
