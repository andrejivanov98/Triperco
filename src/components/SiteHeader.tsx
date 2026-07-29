'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'

/**
 * The bar that sits above everything: identity on the left, one menu on the right.
 *
 * The menu holds a single item today. It exists now so that accounts, saved trips and preferences
 * have somewhere obvious to land later, rather than each arriving as another button in the bar.
 */
export function SiteHeader({
  onNewChat,
  left,
  center,
  right,
}: {
  onNewChat?: () => void
  /** Secondary actions, sitting with the identity. */
  left?: ReactNode
  /** Optional middle slot — the chat uses it for the section navigator. */
  center?: ReactNode
  /** Optional trailing slot, left of the menu. */
  right?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-40 border-b border-hairline/70 bg-canvas/85 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/" aria-label="Triperco — home" className="transition hover:opacity-80">
            <Logo />
          </Link>
          {left}
        </div>

        {center && <div className="flex min-w-0 flex-1 justify-center">{center}</div>}

        <div className="flex shrink-0 items-center gap-2">
          {right}
          <div ref={ref} className="relative">
            <button
              type="button"
              aria-label="Menu"
              aria-haspopup="menu"
              aria-expanded={open}
              data-testid="menu-button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink transition hover:bg-sand"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            {open && (
              <div
                role="menu"
                data-testid="menu-panel"
                className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-hairline bg-white shadow-xl"
              >
                <Link
                  role="menuitem"
                  href="/plan"
                  onClick={() => {
                    setOpen(false)
                    onNewChat?.()
                  }}
                  className="block px-4 py-3 text-sm font-semibold text-ink transition hover:bg-sand"
                >
                  New chat
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
