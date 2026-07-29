import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from './results'

export type RankedItem =
  | { kind: 'flights'; item: Flight; badges: string[] }
  | { kind: 'stays'; item: Stay; badges: string[] }
  | { kind: 'places'; item: Place; badges: string[] }

/** How many cards one carousel shows — enough to choose from, few enough to scan. */
export const MAX_CARDS = 8

/** Below this, a perfect star rating is noise rather than a signal. */
const MIN_REVIEWS_FOR_RATING = 25

function minBy<T>(items: T[], value: (item: T) => number | undefined): T | undefined {
  let best: T | undefined
  let bestValue = Infinity
  for (const item of items) {
    const v = value(item)
    if (v === undefined) continue
    if (v < bestValue) {
      best = item
      bestValue = v
    }
  }
  return best
}

function maxBy<T>(items: T[], value: (item: T) => number | undefined): T | undefined {
  return minBy(items, (item) => {
    const v = value(item)
    return v === undefined ? undefined : -v
  })
}

/** Normalize to 0…1 across the set, where 0 is best. Equal values all score 0. */
function normalized(values: (number | undefined)[]): (number | undefined)[] {
  const present = values.filter((v): v is number => v !== undefined)
  if (present.length === 0) return values
  const lo = Math.min(...present)
  const hi = Math.max(...present)
  const span = hi - lo
  return values.map((v) => (v === undefined ? undefined : span === 0 ? 0 : (v - lo) / span))
}

function flightBadges(items: Flight[]): Map<string, string[]> {
  const badges = new Map<string, string[]>(items.map((f) => [f.id, []]))
  const add = (id: string | undefined, badge: string) => {
    if (!id) return
    const list = badges.get(id)
    if (list && !list.includes(badge)) list.push(badge)
  }

  const prices = normalized(items.map((f) => f.price))
  const durations = normalized(items.map((f) => f.durationMinutes))
  const scores = items.map((_, i) => (prices[i] ?? 0.5) * 0.6 + (durations[i] ?? 0.5) * 0.4)
  const bestValue = items[scores.indexOf(Math.min(...scores))]

  add(bestValue?.id, 'Best value')
  add(minBy(items, (f) => f.price)?.id, 'Cheapest')
  add(minBy(items, (f) => f.durationMinutes)?.id, 'Fastest')
  for (const f of items) if (f.stops === 0) add(f.id, 'Nonstop')

  return badges
}

function stayBadges(items: Stay[]): Map<string, string[]> {
  const badges = new Map<string, string[]>(items.map((s) => [s.id, []]))
  const add = (id: string | undefined, badge: string) => {
    if (!id) return
    const list = badges.get(id)
    if (list && !list.includes(badge)) list.push(badge)
  }

  const credible = items.filter((s) => (s.reviewCount ?? 0) >= MIN_REVIEWS_FOR_RATING)
  const prices = normalized(items.map((s) => s.pricePerNight || undefined))
  // Higher rating is better, so invert it into a cost.
  const ratingCost = normalized(items.map((s) => (s.rating === undefined ? undefined : -s.rating)))
  const scores = items.map((_, i) => (prices[i] ?? 0.5) * 0.5 + (ratingCost[i] ?? 0.5) * 0.5)
  const bestValue = items[scores.indexOf(Math.min(...scores))]

  add(bestValue?.id, 'Best value')
  add(minBy(items, (s) => s.pricePerNight || undefined)?.id, 'Cheapest')
  add(maxBy(credible, (s) => s.rating)?.id, 'Best rated')
  for (const s of items) if (s.dealBadge) add(s.id, s.dealBadge)

  return badges
}

function placeBadges(items: Place[]): Map<string, string[]> {
  const badges = new Map<string, string[]>(items.map((p) => [p.id, []]))
  const add = (id: string | undefined, badge: string) => {
    if (!id) return
    const list = badges.get(id)
    if (list && !list.includes(badge)) list.push(badge)
  }

  const credible = items.filter((p) => (p.reviewCount ?? 0) >= MIN_REVIEWS_FOR_RATING)
  add(maxBy(credible, (p) => p.rating)?.id, 'Top rated')
  add(maxBy(items, (p) => p.reviewCount)?.id, 'Most reviewed')
  return badges
}

/**
 * Score, badge and trim a result set: badged winners first, then the rest in provider order,
 * capped at MAX_CARDS. Pure — the domain objects are never mutated.
 */
export function rankResults(set: ResultSet): RankedItem[] {
  // A place that has closed down can't be planned around, so it never reaches the traveler.
  const items =
    set.kind === 'places' ? set.items.filter((p) => p.permanentlyClosed !== true) : set.items
  set = { ...set, items } as ResultSet

  const badges =
    set.kind === 'flights'
      ? flightBadges(set.items)
      : set.kind === 'stays'
        ? stayBadges(set.items)
        : placeBadges(set.items)

  const ranked = set.items.map((item, index) => ({
    kind: set.kind,
    item,
    badges: badges.get(item.id) ?? [],
    index,
  })) as (RankedItem & { index: number })[]

  // Our recommendation leads, then the rest of the badged winners, then provider order.
  const tier = (badges: string[]) =>
    badges.includes('Best value') ? 0 : badges.length > 0 ? 1 : 2

  ranked.sort((a, b) => {
    const t = tier(a.badges) - tier(b.badges)
    if (t !== 0) return t
    // Among equals, lead with the one carrying the most reasons to pick it.
    if (a.badges.length !== b.badges.length) return b.badges.length - a.badges.length
    return a.index - b.index
  })

  return ranked.slice(0, MAX_CARDS).map(({ kind, item, badges }) => ({ kind, item, badges }) as RankedItem)
}
