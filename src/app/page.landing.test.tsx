import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

// next/link needs the app router mounted; the page itself does not, so stub the anchor.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import Home from './page'

describe('landing page', () => {
  it('answers the first silent question: do I have to sign up', () => {
    render(<Home />)
    // The notice is split into two lines, so read the whole badge rather than one of them.
    const notice = screen.getByText(/free while we're in early access/i).closest('p')
    expect(notice).toHaveTextContent(/no account/i)
    expect(notice).toHaveTextContent(/no card/i)
  })

  it('breaks the early-access notice into two deliberate lines on a phone', () => {
    render(<Home />)
    const first = screen.getByText(/free while we're in early access/i)
    const second = screen.getByText(/no account, no card, just start planning/i)
    // Two separate elements, stacked on a narrow screen and inline from sm up.
    expect(first).not.toBe(second)
    expect(first.parentElement?.className).toContain('flex-col')
    expect(first.parentElement?.className).toContain('sm:block')
  })

  it('keeps the dot at the start of the notice, not adrift in the middle of it', () => {
    render(<Home />)
    const notice = screen.getByText(/free while we're in early access/i).closest('p')
    // items-center left the dot vertically centred once the text wrapped, which read as a stray mark.
    expect(notice?.className).toContain('items-start')
    expect(notice?.className).toContain('sm:items-center')
  })

  it('clears the sticky header when a footer link jumps to a section', () => {
    // Without scroll-mt the anchor lands under the header and looks like it jumped too far.
    const { container } = render(<Home />)
    for (const id of ['how-it-works', 'mission']) {
      const target = container.querySelector(`#${id}`)
      expect(target, `#${id} should exist`).not.toBeNull()
      expect(target?.className).toMatch(/scroll-mt-/)
    }
  })

  it('gives every row its own way into the chat', () => {
    render(<Home />)
    expect(screen.getByRole('link', { name: /ask triperco where to go/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ask triperco what to do/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /describe your vibe/i })).toBeInTheDocument()
  })
})
