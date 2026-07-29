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
          <Heading level={1} className="max-w-2xl text-4xl text-deep sm:text-5xl">
            Where are you heading next?
          </Heading>
          <p className="max-w-xl font-medium text-muted">
            Describe the trip in your own words. Triperco finds the real flights, stays and things to
            do, shows you everything you need to choose, and builds the plan as you chat.
          </p>
          <LandingComposer />
        </section>

        <div id="how-it-works" className="mx-auto w-full max-w-[1500px] px-5 sm:px-8">
          <CategoryTiles />
        </div>

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
