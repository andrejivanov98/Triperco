import { LandingComposer } from '@/components/landing/LandingComposer'
import { CategoryTiles } from '@/components/landing/CategoryTiles'
import { SectionRow } from '@/components/landing/SectionRow'
import { DestinationCard } from '@/components/landing/DestinationCard'
import { ExperienceCard } from '@/components/landing/ExperienceCard'
import { Heading } from '@/components/ui/Heading'
import { destinations, experiences } from '@/lib/landing/content'

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 p-6 pb-16">
      <section className="flex flex-col items-center gap-5 pt-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">✦ Triperco</p>
        <Heading level={1} className="max-w-2xl text-4xl text-deep">
          Where are you heading next?
        </Heading>
        <p className="max-w-xl font-medium text-muted">
          Describe the trip in your own words. Triperco finds the real flights, stays and things to
          do, shows you everything you need to choose, and builds the plan as you chat.
        </p>
        <div className="mt-1 flex w-full justify-center">
          <LandingComposer />
        </div>
      </section>

      <CategoryTiles />

      <SectionRow title="Featured destinations">
        {destinations.map((d) => (
          <DestinationCard key={d.id} destination={d} />
        ))}
      </SectionRow>

      <SectionRow title="Experiences you won’t forget">
        {experiences.map((e) => (
          <ExperienceCard key={e.id} experience={e} />
        ))}
      </SectionRow>

      <SectionRow title="Places we love">
        {destinations
          .slice()
          .reverse()
          .map((d) => (
            <DestinationCard key={d.id} destination={d} />
          ))}
      </SectionRow>
    </main>
  )
}
