import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Stay, Place, Flight } from '@/lib/trip/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { StayResultCard } from './results/StayResultCard'
import { PlaceResultCard } from './results/PlaceResultCard'
import { FlightResultCard } from './results/FlightResultCard'
import { SiteHeader } from './SiteHeader'
import { PlanButton } from './plan/PlanOverlay'

const stay: Stay = {
  id: 's',
  name: 'Hotel',
  source: 'hotel',
  pricePerNight: 100,
  nights: 2,
  photos: [],
  bookUrl: 'x',
}
const place: Place = { id: 'p', name: 'Museum', photos: [], reviewSnippets: [], sourceLinks: {} }
const flight: Flight = { id: 'f', from: 'SKP', to: 'TRN', stops: 0, price: 100, bookUrl: 'x' }

/**
 * A card wider than the phone it is on pushes the whole page sideways, and horizontal page scroll is
 * the single most obvious sign that nobody checked. Every card in a carousel is capped to a share of
 * the viewport, so it can never be wider than the screen.
 */
describe('cards never exceed the viewport', () => {
  it('caps the stay card', () => {
    render(<StayResultCard stay={stay} onOpen={() => {}} />)
    expect(screen.getByTestId('stay-card').className).toMatch(/w-\[min\(.*vw\)\]/)
  })

  it('caps the place card', () => {
    const { container } = render(<PlaceResultCard place={place} onOpen={() => {}} onAdd={() => {}} />)
    expect(container.firstElementChild?.className).toMatch(/w-\[min\(.*vw\)\]/)
  })

  it('caps the flight card', () => {
    const { container } = render(<FlightResultCard flight={flight} onOpen={() => {}} onAdd={() => {}} />)
    expect(container.firstElementChild?.className).toMatch(/w-\[min\(.*vw\)\]/)
  })
})

describe('the header survives a narrow screen', () => {
  it('drops the wordmark, keeping the mark — and never shows both', () => {
    const { container } = render(<SiteHeader />)
    const slots = container.querySelectorAll('a[aria-label="Triperco — home"] > span')
    expect(slots).toHaveLength(2)

    /*
     * The display switch must sit on these wrappers, not on the Logo itself: Logo carries its own
     * `inline-flex`, and whether a `hidden` beside it wins depends on stylesheet order rather than
     * class order — which is how both logos ended up visible at once.
     */
    expect(slots[0].className).toBe('sm:hidden')
    expect(slots[1].className).toBe('hidden sm:block')
    for (const slot of slots) {
      expect(slot.className).not.toMatch(/inline-flex/)
    }
  })

  it('holds the section navigator back until there is room for it', () => {
    const { container } = render(<SiteHeader center={<span>nav</span>} />)
    const slot = [...container.querySelectorAll('div')].find((d) => d.textContent === 'nav')
    expect(slot?.className).toContain('hidden')
    expect(slot?.className).toContain('md:flex')
  })
})

describe('the plan button shrinks rather than pushing the header apart', () => {
  it('keeps its icon and count but drops the label on a phone', () => {
    render(<PlanButton itemCount={3} onOpen={() => {}} />)
    const label = screen.getByText('My plan')
    expect(label.parentElement?.className).toContain('hidden')
    expect(label.parentElement?.className).toContain('sm:flex')
    // The count is what survives, so the button still says something.
    expect(screen.getByTestId('plan-count')).toHaveTextContent('3')
  })
})
