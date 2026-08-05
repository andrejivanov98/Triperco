import { Suspense } from 'react'
import { PlannerScreen } from '@/components/PlannerScreen'

/**
 * The canonical drops the query string on purpose. Every "ask" link on the landing page arrives here
 * as /plan?q=…, and each one is the same page with a different opening question — left alone Google
 * would see them as a pile of near-duplicates competing with each other.
 */
export const metadata = {
  title: 'Plan a trip',
  description:
    'Describe your trip and Triperco searches live flights, stays and things to do, then builds the plan with you as you chat.',
  alternates: { canonical: '/plan' },
}

export default function PlanPage() {
  return (
    <>
      {/*
        Outside the Suspense boundary on purpose, and the only server-rendered content this route has.
        PlannerScreen reads useSearchParams, which bails the whole boundary out to client-side
        rendering — the HTML served for /plan is otherwise an empty <body>, so a crawler arriving here
        finds no heading and not one sentence saying what the page is, despite it being in the sitemap.

        Hidden rather than drawn because the planner opens with its own composer and wants no title
        stacked above it. A screen reader gets a page that finally announces itself, which it did not
        before: there was no h1 on this route at all.
      */}
      <h1 className="sr-only">Plan a trip with Triperco</h1>
      <p className="sr-only">
        Describe the trip you have in mind and Triperco searches live flights, stays and things to do,
        then builds the itinerary with you as you chat. No account needed.
      </p>
      <Suspense>
        <PlannerScreen />
      </Suspense>
    </>
  )
}
