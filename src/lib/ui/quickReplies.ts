import type { TripState } from '@/lib/trip/types'

const MAX_REPLIES = 4

/**
 * Tappable next steps for the composer, derived from what the trip still needs.
 * Deterministic and local — the traveler always has a fast way forward, even mid-stream.
 */
export function suggestQuickReplies(trip: TripState): string[] {
  const { meta, flights, stays, days } = trip
  const where = meta.destination
  const hasDates = Boolean(meta.startDate && meta.endDate)
  const hasActivities = days.some((d) => d.items.length > 0)
  const replies: string[] = []

  if (!where) {
    return ['Somewhere warm and cheap', 'A weekend city break', 'Surprise me with an idea']
  }

  if (!hasDates) {
    replies.push(`When is ${where} best?`, "I'm flexible on dates", 'Plan 5 days there')
    return replies.slice(0, MAX_REPLIES)
  }

  if (flights.length === 0) replies.push(`Find flights to ${where}`)
  if (stays.length === 0) replies.push(`Find a place to stay in ${where}`)

  if (flights.length > 0 && stays.length > 0) {
    if (!hasActivities) replies.push(`Best things to do in ${where}`)
    replies.push(`Where should I eat in ${where}?`)
  }

  if (hasActivities) replies.push('Plan it day by day')
  if (flights.length > 0 || stays.length > 0) replies.push('Make it cheaper')
  replies.push('Add a hidden gem')

  return replies.slice(0, MAX_REPLIES)
}
