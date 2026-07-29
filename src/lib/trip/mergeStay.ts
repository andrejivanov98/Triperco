import type { Stay } from './types'

/**
 * Layer a property-detail lookup over the stay we already have.
 *
 * The two endpoints are complementary: the list search carries amenities and essential info, the
 * property lookup carries the address, sub-ratings, review histogram and booking offers. So only
 * fields the detail actually filled in may win, and identity/nights stay pinned to the trip.
 */
export function mergeStayDetail(base: Stay, detail: Partial<Stay> | null | undefined): Stay {
  if (!detail) return base

  const merged: Stay = { ...base }
  for (const [key, value] of Object.entries(detail)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value) && value.length === 0) continue
    Object.assign(merged, { [key]: value })
  }

  merged.id = base.id
  merged.nights = base.nights
  return merged
}
