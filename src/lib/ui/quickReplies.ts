import type { TripState } from '@/lib/trip/types'
import { planStage } from '@/lib/trip/stage'

/**
 * Tappable next steps for the composer, derived from the stage the plan is on.
 * Deterministic and local — the traveler always has a fast way forward, even mid-stream.
 *
 * This used to have a rule of its own, and it disagreed with the conversation. Someone who opened
 * with "Skopje - Tenerife, 19-28 March, 2 adults" typed their destination as free text rather than
 * picking it, so `meta.destination` was empty, so the chips offered "Somewhere warm and cheap" and
 * "Surprise me with an idea" underneath a message about flights to Tenerife — the app inviting them
 * to change their mind about a destination they had already named. Reading the stage instead means
 * the chips and the agent are answering the same question about the same trip.
 */
export function suggestQuickReplies(trip: TripState): string[] {
  return planStage(trip).replies
}
