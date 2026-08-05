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
import { homepageStructuredData } from '@/lib/seo/structuredData'

export const metadata = {
  alternates: { canonical: '/' },
}

const ask = (question: string) => `/plan?q=${encodeURIComponent(question)}`

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // The content is ours and built from static strings, so there is nothing here to escape.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageStructuredData()) }}
      />
      <SiteHeader />

      <main className="flex flex-col gap-14 pb-4">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-5 pt-12 text-center sm:px-8">
          {/*
            Said before the composer, because "do I have to sign up" is the first silent question.

            On a phone this is two deliberate lines rather than three ragged ones, and the dot marks
            the start of the first. Centred, it drifted into the middle of the wrapped block and read
            as a stray mark rather than the beginning of a sentence.
          */}
          <p className="inline-flex items-start gap-2 rounded-2xl border border-accent/25 bg-accent-050 px-4 py-2 text-left text-xs font-semibold text-accent-600 sm:items-center sm:rounded-full sm:px-3.5 sm:py-1.5">
            <span
              aria-hidden
              className="mt-[0.3rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent sm:mt-0"
            />
            {/* Stacked on a narrow screen, one sentence with its dash on a wide one. */}
            <span className="flex flex-col sm:block">
              <span>Free while we&apos;re in early access</span>
              <span className="hidden sm:inline"> — </span>
              <span>no account, no card, just start planning</span>
            </span>
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
