import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTripStore } from '@/lib/share/tripStore'
import { TripSummarySheet } from '@/components/booking/TripSummarySheet'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/landing/SiteFooter'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { Heading } from '@/components/ui/Heading'
import { Icon } from '@/components/ui/Icon'
import { formatDateRange } from '@/lib/trip/dates'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trip = await getTripStore().load(id)
  const title = trip?.meta.title ?? trip?.meta.destination ?? 'A trip'
  return {
    title: `${title} · Triperco`,
    description: 'A trip planned with Triperco — flights, somewhere to stay, and what to do.',
  }
}

/**
 * A shared trip, as a page in its own right rather than a copy of the planner.
 *
 * Whoever opens this link did not plan the trip and has no conversation behind it, so the itinerary
 * has to stand alone: a cover, the plan in full, and one obvious way to make it theirs.
 */
export default async function SharedTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trip = await getTripStore().load(id)
  if (!trip) notFound()

  const title = trip.meta.title ?? `${trip.meta.destination ?? 'A'} trip`
  const range = formatDateRange(trip.meta.startDate, trip.meta.endDate)
  const nights = trip.stays[0]?.nights

  return (
    <>
      <SiteHeader />

      <main className="flex flex-col">
        <section className="relative h-[42vh] min-h-[18rem] w-full overflow-hidden">
          <RemoteImage
            src={trip.meta.coverImage}
            alt={trip.meta.destination ?? 'Trip cover'}
            fallbackGlyph={<Icon name="compass" className="h-10 w-10" />}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-deep/85 via-deep/35 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl px-6 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              A trip on Triperco
            </p>
            <Heading level={1} className="mt-1 text-4xl text-white sm:text-5xl">
              {title}
            </Heading>
            <p className="mt-2 text-sm font-medium text-white/80">
              {[
                range,
                nights ? `${nights} night${nights === 1 ? '' : 's'}` : undefined,
                `${trip.meta.travelers} traveler${trip.meta.travelers === 1 ? '' : 's'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-6 py-10">
          <TripSummarySheet trip={trip} />
        </section>

        <section className="mx-auto mb-16 w-full max-w-3xl px-6">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-hairline bg-sand/40 px-6 py-10 text-center">
            <Heading level={2} className="text-2xl text-deep">
              Want this trip, on your dates?
            </Heading>
            <p className="max-w-md text-sm font-medium text-muted">
              Open it in Triperco and it becomes yours — same shape, your dates, your party, priced
              live. Change anything you like, or start somewhere else entirely.
            </p>
            <Link
              href={`/plan?from=${id}`}
              className="mt-1 rounded-2xl bg-deep px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-deep/25 transition hover:bg-ink"
            >
              Make this trip mine →
            </Link>
            <Link href="/plan" className="text-xs font-bold text-accent transition hover:underline">
              Or plan a different trip
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
