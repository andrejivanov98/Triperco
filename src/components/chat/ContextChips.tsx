'use client'

import type { TripMeta } from '@/lib/trip/types'

export function ContextChips({
  meta,
  onEdit,
}: {
  meta: TripMeta
  onEdit: (patch: Partial<TripMeta>) => void
}) {
  const travelers = meta.travelers > 0 ? meta.travelers : 1
  const chip = 'rounded-full border border-hairline bg-white/60 px-2.5 py-1 text-xs font-medium text-ink'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={meta.destination ?? ''}
        onChange={(e) => onEdit({ destination: e.target.value })}
        placeholder="Where to?"
        className={`${chip} w-28 outline-none placeholder:text-muted`}
      />
      <input
        type="date"
        value={meta.startDate ?? ''}
        onChange={(e) => onEdit({ startDate: e.target.value })}
        aria-label="Start date"
        className={chip}
      />
      <input
        type="date"
        value={meta.endDate ?? ''}
        onChange={(e) => onEdit({ endDate: e.target.value })}
        aria-label="End date"
        className={chip}
      />
      <div className={`${chip} inline-flex items-center gap-2`}>
        <button
          type="button"
          aria-label="Remove traveler"
          onClick={() => onEdit({ travelers: Math.max(1, travelers - 1) })}
        >
          −
        </button>
        <span aria-label="travelers">{travelers}</span>
        <button type="button" aria-label="Add traveler" onClick={() => onEdit({ travelers: travelers + 1 })}>
          +
        </button>
      </div>
    </div>
  )
}
