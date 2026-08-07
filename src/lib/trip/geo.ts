import type { Coords } from './types'

/**
 * How far a result may sit from the destination and still belong to the trip.
 *
 * This exists because of a specific and unforgivable failure: asked for somewhere to stay in
 * Barcelona, the planner rendered hotels in the United States. The provider's search engines are
 * geo-biased, and a query with no locality in it resolves against their own default — so a card can
 * be a perfectly real hotel and still be a thousand miles from the trip.
 *
 * Distance is the check because it needs no gazetteer and no language. "Barcelona" and "Barcelone"
 * and "巴塞罗那" are all the same point.
 */

/** A stay this far out is a different trip. Generous enough for an out-of-town airport hotel. */
export const STAY_RADIUS_KM = 120

/** Things to do stretch further — a day trip from a city is still part of the trip. */
export const PLACE_RADIUS_KM = 150

const EARTH_RADIUS_KM = 6371

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Whether coordinates were reported at all, and in a range a real place can occupy. */
export function isRealPoint(coords: Coords | undefined): coords is Coords {
  if (!coords) return false
  const { lat, lng } = coords
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
  // 0,0 is in the Gulf of Guinea. In practice it is a provider's missing value.
  return lat !== 0 || lng !== 0
}

/**
 * Split results into the ones at the destination and the ones somewhere else entirely.
 *
 * A result with no usable coordinates counts as near. The fence removes what is *provably*
 * elsewhere; it does not ask a place to prove it belongs, because plenty of real listings come back
 * without a location and dropping those would be its own kind of wrong answer.
 */
export function partitionNear<T extends { coords?: Coords }>(
  items: T[],
  centre: Coords | null | undefined,
  radiusKm: number,
): { near: T[]; far: T[] } {
  const middle = centre ?? undefined
  if (!isRealPoint(middle)) return { near: items, far: [] }
  const near: T[] = []
  const far: T[] = []
  for (const item of items) {
    if (!isRealPoint(item.coords)) near.push(item)
    else if (haversineKm(item.coords, middle) <= radiusKm) near.push(item)
    else far.push(item)
  }
  return { near, far }
}

/** The `@lat,lng,zoom` bias string the maps engine takes. */
export function asBias(coords: Coords, zoom = 12): string {
  return `@${coords.lat},${coords.lng},${zoom}z`
}

/**
 * `lat,lng` — the one way of naming a place a directions engine cannot misread, decline, or stop to
 * ask a question about. Written in one place because both the plan's own journeys and the geocode
 * fallback behind them have to spell it identically, or the cache and the retry guard stop matching.
 */
export function asPoint(coords: Coords): string {
  return `${coords.lat},${coords.lng}`
}
