import type { TripMeta } from '@/lib/trip/types'

/** The structured context the landing composer can hand over. */
export interface OpeningContext {
  q?: string
  destination?: string
  startDate?: string
  endDate?: string
  rooms?: number
  adults?: number
  children?: number
  travelers?: number
}

/** Read the composer's context off the URL. */
export function readOpeningContext(params: URLSearchParams): OpeningContext {
  const num = (key: string): number | undefined => {
    const raw = params.get(key)
    if (!raw) return undefined
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : undefined
  }
  return {
    q: params.get('q') ?? undefined,
    destination: params.get('dest') ?? undefined,
    startDate: params.get('start') ?? undefined,
    endDate: params.get('end') ?? undefined,
    rooms: num('rooms'),
    adults: num('adults'),
    children: num('children'),
    travelers: num('travelers'),
  }
}

/** The trip metadata implied by that context. Children count as travelers. */
export function contextToMeta(context: OpeningContext): Partial<TripMeta> {
  const travelers =
    context.adults !== undefined || context.children !== undefined
      ? (context.adults ?? 1) + (context.children ?? 0)
      : context.travelers

  return {
    ...(context.destination ? { destination: context.destination } : {}),
    ...(context.startDate ? { startDate: context.startDate } : {}),
    ...(context.endDate ? { endDate: context.endDate } : {}),
    ...(travelers ? { travelers } : {}),
    ...(context.rooms ? { rooms: context.rooms } : {}),
    ...(context.adults ? { adults: context.adults } : {}),
    ...(context.children ? { children: context.children } : {}),
  }
}

function partyPhrase(context: OpeningContext): string | undefined {
  const parts: string[] = []
  if (context.adults !== undefined) {
    parts.push(`${context.adults} adult${context.adults === 1 ? '' : 's'}`)
  } else if (context.travelers !== undefined) {
    parts.push(`${context.travelers} traveler${context.travelers === 1 ? '' : 's'}`)
  }
  if (context.children) parts.push(`${context.children} child${context.children === 1 ? '' : 'ren'}`)
  if (context.rooms && context.rooms > 1) parts.push(`${context.rooms} rooms`)
  return parts.length ? parts.join(', ') : undefined
}

/**
 * Compose the first chat message. Whatever the traveler typed leads; the structured context is
 * appended as a plain sentence so the agent searches with it instead of asking again.
 */
export function buildOpeningMessage(context: OpeningContext): string | null {
  const details: string[] = []
  if (context.startDate && context.endDate) {
    details.push(`from ${context.startDate} to ${context.endDate}`)
  } else if (context.startDate) {
    details.push(`starting ${context.startDate}`)
  }
  const party = partyPhrase(context)
  if (party) details.push(`for ${party}`)

  const typed = context.q?.trim()
  if (typed) {
    if (details.length === 0) return typed
    const separator = /[.!?]$/.test(typed) ? '' : '.'
    return `${typed}${separator} Travelling ${details.join(' ')}.`
  }

  if (!context.destination && details.length === 0) return null

  const where = context.destination ?? 'somewhere great'
  return [`Plan my trip to ${where}`, ...details].join(' ') + '.'
}
