'use client'

import type { AddSlot } from '@/lib/trip/timeline'

/**
 * Each empty slot says what is missing and what tapping it will do, instead of a flat line of grey
 * text. The heading names the gap; the line under it is the action.
 */
const SLOT: Record<
  AddSlot,
  { glyph: string; title: (where: string) => string; action: string }
> = {
  flights: { glyph: '✈', title: () => 'No flights yet', action: 'Find the way there' },
  'return-flight': { glyph: '✈', title: () => 'One way only', action: 'Find the flight home' },
  stays: {
    glyph: '🛏',
    title: (where) => `Nowhere to sleep${where ? ` in ${where}` : ''}`,
    action: 'Find a place to stay',
  },
  activities: { glyph: '🎫', title: () => 'Nothing planned yet', action: 'Find things to do' },
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
  const { glyph, title, action } = SLOT[slot]

  return (
    <button
      type="button"
      onClick={() => onClick?.(slot, dayLabel)}
      disabled={!onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-hairline bg-white/40 px-3 py-3 text-left transition hover:border-accent/50 hover:bg-accent-050/60 disabled:cursor-default disabled:hover:border-hairline disabled:hover:bg-white/40"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sand text-base transition group-hover:bg-white"
      >
        {glyph}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-bold text-ink">{title(destination ?? '')}</span>
        <span className="truncate text-[11px] font-medium text-muted group-hover:text-accent-600">
          {action}
        </span>
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
