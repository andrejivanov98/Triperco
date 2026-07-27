'use client'

import Link from 'next/link'

/** Top bar for the planner: identity, a way out, and a way to start fresh. */
export function PlannerHeader({
  title,
  onNewTrip,
  right,
}: {
  title?: string
  onNewTrip: () => void
  right?: React.ReactNode
}) {
  return (
    <header className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex min-w-0 items-baseline gap-3">
        <Link href="/" className="shrink-0 text-sm font-bold tracking-tight text-accent">
          ✦ Triperco
        </Link>
        {title && (
          <span className="truncate text-sm font-semibold text-muted" title={title}>
            {title}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {right}
        <button
          type="button"
          onClick={onNewTrip}
          className="rounded-full border border-hairline bg-white/70 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-white"
        >
          + New trip
        </button>
      </div>
    </header>
  )
}
