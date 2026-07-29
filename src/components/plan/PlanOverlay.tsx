'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'

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
  title,
  onClose,
  children,
}: {
  open: boolean
  /** Shown in the heading so the traveler can see the plan is not empty before reading it. */
  itemCount: number
  /** The trip's own name, once it has one. A trip called "Your plan" belongs to nobody. */
  title?: string
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
        aria-label={title ?? 'Your plan'}
        data-testid="plan-pane"
        className="glass relative flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden rounded-none p-3 shadow-2xl sm:max-w-2xl sm:rounded-l-3xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <span
            data-testid="plan-title"
            className="truncate font-display text-base text-ink"
            title={title}
          >
            {title ?? 'Your plan'}
            {itemCount > 0 && <span className="ml-1.5 text-xs font-semibold text-muted">· {itemCount}</span>}
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

/**
 * The way back to the plan. Now that the plan is not on screen, this is the only thing holding it —
 * so it is styled as the primary action on the page rather than another piece of chrome, and it
 * pulses once whenever something new lands in the plan.
 */
export function PlanButton({ itemCount, onOpen }: { itemCount: number; onOpen: () => void }) {
  const [pulse, setPulse] = useState(false)
  const previous = useRef(itemCount)

  useEffect(() => {
    if (itemCount > previous.current) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 900)
      previous.current = itemCount
      return () => clearTimeout(timer)
    }
    previous.current = itemCount
  }, [itemCount])

  return (
    <button
      type="button"
      data-testid="plan-button"
      onClick={onOpen}
      aria-label={itemCount > 0 ? `Open your plan, ${itemCount} items` : 'Open your plan'}
      className={
        'flex items-center gap-2 rounded-2xl bg-deep px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-deep/25 transition hover:bg-ink hover:shadow-xl sm:pl-4 sm:pr-3 ' +
        (pulse ? 'scale-105 ring-4 ring-accent/40' : 'scale-100')
      }
    >
      <Icon name="map" className="h-[18px] w-[18px] shrink-0" />
      {/* On a phone the icon and the count say it; the label is what gives way. */}
      <span className="hidden flex-col items-start leading-none sm:flex">
        <span>My plan</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
          {itemCount > 0 ? `${itemCount} added` : 'Empty'}
        </span>
      </span>
      {itemCount > 0 && (
        <span
          data-testid="plan-count"
          className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[11px] font-bold leading-tight text-white sm:ml-0.5"
        >
          {itemCount}
        </span>
      )}
      <span aria-hidden className="ml-0.5 hidden text-xs text-white/60 sm:inline">
        ›
      </span>
    </button>
  )
}
