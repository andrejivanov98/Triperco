'use client'

import { canStep, stepGuests, type Guests } from '@/lib/ui/guests'

const ROWS: { field: keyof Guests; label: string; hint: string }[] = [
  { field: 'rooms', label: 'Rooms', hint: 'Number of rooms' },
  { field: 'adults', label: 'Adults', hint: 'Ages 18+' },
  { field: 'children', label: 'Children', hint: 'Ages 0–17' },
]

function StepButton({
  sign,
  label,
  disabled,
  onClick,
}: {
  sign: '−' | '+'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-white text-base font-semibold text-ink transition hover:border-accent/50 disabled:opacity-30"
    >
      {sign}
    </button>
  )
}

/** Rooms / Adults / Children steppers, as shown in the composer popover. */
export function GuestPicker({
  guests,
  onChange,
}: {
  guests: Guests
  onChange: (guests: Guests) => void
}) {
  return (
    <div className="flex flex-col">
      {ROWS.map(({ field, label, hint }) => (
        <div key={field} className="flex items-center justify-between gap-4 px-3 py-3">
          <div>
            <div className="text-sm font-bold text-ink">{label}</div>
            <div className="text-[11px] font-semibold text-muted">{hint}</div>
          </div>
          <div className="flex items-center gap-3">
            <StepButton
              sign="−"
              label={`Fewer ${label.toLowerCase()}`}
              disabled={!canStep(guests, field, -1)}
              onClick={() => onChange(stepGuests(guests, field, -1))}
            />
            <span aria-label={label} className="w-4 text-center text-sm font-bold text-ink">
              {guests[field]}
            </span>
            <StepButton
              sign="+"
              label={`More ${label.toLowerCase()}`}
              disabled={!canStep(guests, field, 1)}
              onClick={() => onChange(stepGuests(guests, field, 1))}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
