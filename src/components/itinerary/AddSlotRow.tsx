'use client'

import type { AddSlot } from '@/lib/trip/timeline'

const SLOT: Record<AddSlot, { glyph: string; label: (where: string) => string }> = {
  flights: { glyph: '✈', label: () => 'Search flights' },
  'return-flight': { glyph: '✈', label: () => 'Add a return flight' },
  stays: { glyph: '🛏', label: (where) => `Add a place to stay${where ? ` in ${where}` : ''}` },
  activities: { glyph: '🎫', label: () => 'Add things to do' },
}

/** An empty slot in the plan. Clicking it asks the chat to fill it. */
export function AddSlotRow({
  slot,
  destination,
  dayLabel,
  onClick,
}: {
  slot: AddSlot
  destination?: string
  dayLabel?: string
  onClick?: (slot: AddSlot, dayLabel?: string) => void
}) {
  const { glyph, label } = SLOT[slot]
  const text = label(destination ?? '')

  return (
    <button
      type="button"
      onClick={() => onClick?.(slot, dayLabel)}
      disabled={!onClick}
      className="group flex w-full items-center gap-2.5 rounded-xl border border-dashed border-hairline px-3 py-3 text-left transition hover:border-accent/50 hover:bg-accent-050/60 disabled:cursor-default disabled:hover:border-hairline disabled:hover:bg-transparent"
    >
      <span aria-hidden="true" className="text-sm">
        {glyph}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted group-hover:text-ink">
        {text}
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 text-xs font-bold text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
      >
        →
      </span>
    </button>
  )
}

/** The prompt sent to the chat when a slot is tapped. */
export function slotPrompt(slot: AddSlot, destination?: string, dayLabel?: string): string {
  const where = destination ? ` to ${destination}` : ''
  const inWhere = destination ? ` in ${destination}` : ''
  const onDay = dayLabel ? ` for ${dayLabel}` : ''

  switch (slot) {
    case 'flights':
      return `Find flights${where} for my dates.`
    case 'return-flight':
      return `Find my return flight home${destination ? ` from ${destination}` : ''}.`
    case 'stays':
      return `Find me a place to stay${inWhere}.`
    case 'activities':
      return `Suggest things to do${inWhere}${onDay}.`
  }
}
