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
    const notice = screen.getByText(/free while we're in early access/i)
    expect(notice).toHaveTextContent(/no account/i)
    expect(notice).toHaveTextContent(/no card/i)
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
