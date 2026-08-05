import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Suspends forever, standing in for the real planner.
 *
 * That is the whole point of the test: PlannerScreen reads useSearchParams, so on the server its
 * boundary bails out to client-side rendering and contributes nothing to the HTML. Anything a crawler
 * is meant to see has to survive this component never rendering at all.
 */
vi.mock('@/components/PlannerScreen', () => ({
  PlannerScreen: () => {
    throw new Promise<never>(() => {})
  },
}))

const { default: PlanPage } = await import('./page')

describe('/plan', () => {
  it('names the page in an h1 even though the planner itself renders nothing', () => {
    render(<PlanPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Plan a trip with Triperco')
  })

  it('says what the page is for, so the route is not an empty document', () => {
    render(<PlanPage />)
    expect(screen.getByText(/searches live flights, stays and things to do/i)).toBeInTheDocument()
  })

  it('renders exactly one h1, since a second would split the page’s topic', () => {
    render(<PlanPage />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
