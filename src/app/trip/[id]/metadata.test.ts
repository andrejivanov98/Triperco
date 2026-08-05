import { describe, it, expect, vi } from 'vitest'
import { createTrip } from '@/lib/trip/tripState'
import type { TripState } from '@/lib/trip/types'

const trips = new Map<string, TripState>([['known', createTrip('Rome trip')]])

vi.mock('@/lib/share/tripStore', () => ({
  getTripStore: () => ({ load: async (id: string) => trips.get(id) ?? null }),
}))

const { generateMetadata } = await import('./page')

const meta = (id: string) => generateMetadata({ params: Promise.resolve({ id }) })

/**
 * Sharing a plan with three friends is not publishing it, and the unguessable link is the only thing
 * protecting it — a trip surfacing in search results would be a leak, not traffic.
 *
 * This is a regression guard, not a restatement: robots.txt disallows /trip/, but the root layout
 * also declares a site-wide `robots: { index: true }`. Next resolves that field by replacing rather
 * than merging, so these pages stay noindex — and this fails loudly if that ever stops being true.
 */
describe('a shared trip page', () => {
  it('is noindex, nofollow', async () => {
    expect((await meta('known')).robots).toEqual({ index: false, follow: false })
  })

  it('is noindex even when the trip does not exist', async () => {
    expect((await meta('missing')).robots).toEqual({ index: false, follow: false })
  })

  it('declares no canonical, which would advertise the link as a page worth having', async () => {
    // Loosely typed on purpose: the return is a union whose not-found branch has no such key.
    const resolved = (await meta('known')) as Record<string, unknown>
    expect(resolved.alternates).toBeUndefined()
  })

  /** noindex is for search engines; the preview crawlers that matter read og: tags regardless. */
  it('still carries a link preview, so pasting it into a chat shows the trip', async () => {
    const og = (await meta('known')).openGraph as { title: string } | undefined
    expect(og?.title).toContain('Triperco')
  })
})
