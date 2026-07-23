import { Suspense } from 'react'
import { PlannerScreen } from '@/components/PlannerScreen'

export default function PlanPage() {
  return (
    <Suspense>
      <PlannerScreen />
    </Suspense>
  )
}
