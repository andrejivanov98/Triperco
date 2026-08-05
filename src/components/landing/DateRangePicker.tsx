'use client'

import { useState } from 'react'
import {
  addMonths,
  isEdge,
  isInRange,
  monthGrid,
  monthLabel,
  selectDate,
  WEEKDAY_LABELS,
  type DateRange,
} from '@/lib/ui/calendar'
import { Icon } from '@/components/ui/Icon'

/** Month calendar with range selection. `today` is injectable so tests stay deterministic. */
export function DateRangePicker({
  range,
  onChange,
  today = new Date(),
}: {
  range: DateRange
  onChange: (range: DateRange) => void
  today?: Date
}) {
  const todayIso = today.toISOString().slice(0, 10)
  const [view, setView] = useState({ year: today.getUTCFullYear(), month: today.getUTCMonth() })
  const cells = monthGrid(view.year, view.month)

  function cellClass(iso: string): string {
    const base =
      'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition'
    if (isEdge(range, iso)) return `${base} bg-deep text-white`
    if (isInRange(range, iso)) return `${base} bg-accent-050 text-accent-600`
    if (iso < todayIso) return `${base} text-muted/40`
    return `${base} text-ink hover:bg-sand`
  }

  return (
    <div className="p-2">
      <div className="mb-1 flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setView(addMonths(view.year, view.month, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-ink">{monthLabel(view.year, view.month)}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setView(addMonths(view.year, view.month, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
        >
          <Icon name="chevron-right" className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 justify-items-center">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="text-[10px] font-bold uppercase tracking-wide text-muted">
            {d}
          </span>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`pad-${i}`} />
          ) : (
            <button
              key={cell.iso}
              type="button"
              // Past dates are unbookable, so they aren't selectable either.
              disabled={cell.iso < todayIso}
              aria-label={cell.iso}
              onClick={() => onChange(selectDate(range, cell.iso))}
              className={cellClass(cell.iso)}
            >
              {cell.day}
            </button>
          ),
        )}
      </div>

      {range.start && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-bold text-muted transition hover:bg-sand hover:text-ink"
        >
          Clear dates
        </button>
      )}
    </div>
  )
}
