'use client'

import { useEffect, useRef, useState } from 'react'
import { BOOKING_LABEL, type BookingStatus } from '@/lib/trip/booking'
import { Icon } from '@/components/ui/Icon'

const STATUSES: BookingStatus[] = ['not_booked', 'booked', 'confirmed']

/** Each state gets its own colour, so a glance down the list tells you what is left to do. */
const STYLE: Record<BookingStatus, { dot: string; pill: string }> = {
  not_booked: { dot: 'bg-muted', pill: 'border-hairline bg-white text-muted hover:bg-sand' },
  booked: { dot: 'bg-accent', pill: 'border-accent/40 bg-accent-050 text-accent-600 hover:bg-accent/10' },
  confirmed: {
    dot: 'bg-green-600',
    pill: 'border-green-600/30 bg-green-50 text-green-800 hover:bg-green-100',
  },
}

/**
 * A menu built from the app's own parts rather than the browser's.
 *
 * A native select renders as the operating system's widget — a grey box in the middle of a warm
 * paper interface — and cannot show the state colours that make the list scannable.
 */
export function StatusControl({
  status,
  onChange,
  label,
}: {
  status: BookingStatus
  onChange: (status: BookingStatus) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const style = STYLE[status]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Booking status for ${label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={
          'flex w-full items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide transition ' +
          style.pill
        }
      >
        <span aria-hidden className={'h-2 w-2 shrink-0 rounded-full ' + style.dot} />
        {BOOKING_LABEL[status]}
        <span aria-hidden className="text-[9px] opacity-60">
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={`Booking status for ${label}`}
          className="absolute right-0 z-10 mt-1.5 w-48 overflow-hidden rounded-2xl border border-hairline bg-white shadow-xl"
        >
          {STATUSES.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === status}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 border-t border-hairline px-3.5 py-2.5 text-left text-xs font-semibold text-ink transition first:border-t-0 hover:bg-sand"
              >
                <span aria-hidden className={'h-2 w-2 shrink-0 rounded-full ' + STYLE[option].dot} />
                <span className="flex-1">{BOOKING_LABEL[option]}</span>
                {option === status && <Icon name="check" className="h-3.5 w-3.5 text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
