'use client'

import { useEffect, type ReactNode } from 'react'

/**
 * The plan, summoned rather than always present.
 *
 * A permanent side pane costs a third of the screen forever and asserts that the plan is a constant
 * companion. Making it a drawer gives the conversation the full width and makes the plan a place you
 * go — reachable from a button that always shows how much is in it, so nothing feels lost.
 */
export function PlanOverlay({
  open,
  itemCount,
  onClose,
  children,
}: {
  open: boolean
  /** Shown in the heading so the traveler can see the plan is not empty before reading it. */
  itemCount: number
  onClose: () => void
  children: ReactNode
}) {
  // Escape closes it, and the page behind must not scroll while it is up.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div data-testid="plan-overlay" className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Dismiss plan"
        onClick={onClose}
        className="absolute inset-0 bg-deep/30 backdrop-blur-[2px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your plan"
        data-testid="plan-pane"
        className="glass relative flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden rounded-none p-3 shadow-2xl sm:max-w-md sm:rounded-l-3xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">
            Your plan{itemCount > 0 ? ` · ${itemCount}` : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-sand"
          >
            Close ✕
          </button>
        </div>

        <div className="min-h-0 flex-1">{children}</div>
      </aside>
    </div>
  )
}

/** The always-visible way back to the plan, carrying how much is in it. */
export function PlanButton({ itemCount, onOpen }: { itemCount: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      data-testid="plan-button"
      onClick={onOpen}
      className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-sand"
    >
      <span aria-hidden>🧭</span>
      <span>Plan</span>
      {itemCount > 0 && (
        <span
          data-testid="plan-count"
          className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white"
        >
          {itemCount}
        </span>
      )}
    </button>
  )
}
