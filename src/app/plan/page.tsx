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
    <Suspense>
      <PlannerScreen />
    </Suspense>
  )
}
