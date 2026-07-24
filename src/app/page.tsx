import { HeroPrompt } from '@/components/landing/HeroPrompt'
import { SectionRow } from '@/components/landing/SectionRow'
import { DestinationCard } from '@/components/landing/DestinationCard'
import { ExperienceCard } from '@/components/landing/ExperienceCard'
import { destinations, experiences } from '@/lib/landing/content'

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 p-6 pb-16">
      <section className="flex flex-col items-center gap-4 pt-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">✦ Triperco</p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900">
          Plan your whole trip in one conversation.
        </h1>
        <p className="max-w-xl font-medium text-slate-500">
          Tell Triperco where you want to go. It finds flights, stays, and things to do —
          and builds a plan you can book yourself.
        </p>
        <div className="mt-2 flex w-full justify-center">
          <HeroPrompt />
        </div>
      </section>

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
