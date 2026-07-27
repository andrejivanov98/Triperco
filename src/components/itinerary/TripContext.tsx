'use client'

import type { TripMeta } from '@/lib/trip/types'

const FIELD =
  'w-full rounded-xl border border-hairline bg-white/70 px-2 py-1.5 text-xs font-medium text-ink outline-none transition focus:border-accent/50 placeholder:text-muted'

/** The trip's who/where/when, editable in place so the traveler can correct an assumption. */
export function TripContext({
  meta,
  onEdit,
}: {
  meta: TripMeta
  onEdit: (patch: Partial<TripMeta>) => void
}) {
  const travelers = meta.travelers > 0 ? meta.travelers : 1

  return (
    <div className="grid shrink-0 grid-cols-2 gap-1.5">
      <label className="col-span-2 flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Destination</span>
        <input
          value={meta.destination ?? ''}
          onChange={(e) => onEdit({ destination: e.target.value })}
          placeholder="Where to?"
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Start</span>
        <input
          type="date"
          value={meta.startDate ?? ''}
          onChange={(e) => onEdit({ startDate: e.target.value })}
          aria-label="Start date"
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">End</span>
        <input
          type="date"
          value={meta.endDate ?? ''}
          onChange={(e) => onEdit({ endDate: e.target.value })}
          aria-label="End date"
          className={FIELD}
        />
      </label>

      <div className="col-span-2 flex items-center justify-between rounded-xl border border-hairline bg-white/70 px-2 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Travelers</span>
        <div className="flex items-center gap-3 text-xs font-bold text-ink">
          <button
            type="button"
            aria-label="Remove traveler"
            onClick={() => onEdit({ travelers: Math.max(1, travelers - 1) })}
            className="text-muted transition hover:text-ink"
          >
            −
          </button>
          <span aria-label="travelers">{travelers}</span>
          <button
            type="button"
            aria-label="Add traveler"
            onClick={() => onEdit({ travelers: travelers + 1 })}
            className="text-muted transition hover:text-ink"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
