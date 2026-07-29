import { LandingComposer } from '@/components/landing/LandingComposer'
import { CategoryTiles } from '@/components/landing/CategoryTiles'
import { SectionRow } from '@/components/landing/SectionRow'
import { DestinationCard } from '@/components/landing/DestinationCard'
import { ExperienceCard } from '@/components/landing/ExperienceCard'
import { MissionNote } from '@/components/landing/MissionNote'
import { SiteFooter } from '@/components/landing/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { Heading } from '@/components/ui/Heading'
import { destinations, experiences, lovedPlaces } from '@/lib/landing/content'

const ask = (question: string) => `/plan?q=${encodeURIComponent(question)}`

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex flex-col gap-14 pb-4">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-5 pt-12 text-center sm:px-8">
          {/* Said before the composer, because "do I have to sign up" is the first silent question. */}
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-050 px-3.5 py-1.5 text-xs font-semibold text-accent-600">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            Free while we&apos;re in early access — no account, no card, just start planning
          </p>
          <Heading level={1} className="max-w-2xl text-4xl text-deep sm:text-5xl">
            Where are you heading next?
          </Heading>
          <p className="max-w-xl font-medium text-muted">
            Describe the trip in your own words. Triperco finds the real flights, stays and things to
            do, shows you everything you need to choose, and builds the plan as you chat.
          </p>
          <LandingComposer />
        </section>

        {/*
          scroll-mt clears the sticky header. Without it the browser scrolls the anchor to y=0,
          the header covers it, and you land looking at whatever comes next — which is why this
          appeared to jump to Featured destinations.
        */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-5 sm:px-8"
        >
          <CategoryTiles />
        </section>

        <SectionRow
          title="Featured destinations"
          subtitle="Ask Triperco to turn any of these into a full plan."
          cta={{ label: 'Ask Triperco where to go', href: ask('Help me choose where to go.') }}
        >
          {destinations.map((d) => (
            <DestinationCard key={d.id} destination={d} />
          ))}
        </SectionRow>

        <SectionRow
          title="Experiences you won’t forget"
          subtitle="Ask Triperco to build the itinerary, day by day."
          cta={{
            label: 'Ask Triperco what to do',
            href: ask('Plan me a trip around an experience worth travelling for.'),
          }}
        >
          {experiences.map((e) => (
            <ExperienceCard key={e.id} experience={e} />
          ))}
        </SectionRow>

        <SectionRow
          title="Places we love"
          subtitle="Ask Triperco to suggest destinations based on the vibe you're looking for."
          cta={{
            label: 'Describe your vibe to Triperco',
            href: ask('Suggest somewhere based on the vibe I am after.'),
          }}
        >
          {lovedPlaces.map((p) => (
            <DestinationCard key={p.id} destination={p} />
          ))}
        </SectionRow>

        <MissionNote />
      </main>

      <SiteFooter />
    </>
  )
}
