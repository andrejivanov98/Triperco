'use client'

import { Icon } from './Icon'

/**
 * The press feedback every action button shares.
 *
 * A button that looks identical before and after a click leaves you unsure whether it registered —
 * so these dip under the finger and lift back. `active:` fires on touch as well as mouse, which is
 * where the doubt is worst.
 */
export const PRESSABLE =
  'transition duration-150 active:scale-[0.96] active:duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'

/**
 * Add something to the plan, or say that it is already there.
 *
 * Once added the button stops inviting a press: it names the state rather than the action, and is
 * disabled. Adding is idempotent underneath, so a second press would be harmless — but silently
 * harmless is exactly the feedback problem this fixes.
 */
export function AddButton({
  added,
  onAdd,
  label,
  addedLabel = 'Added',
  tone = 'accent',
  className = '',
}: {
  added: boolean
  onAdd: () => void
  label: string
  addedLabel?: string
  tone?: 'accent' | 'deep'
  className?: string
}) {
  if (added) {
    return (
      <span
        data-testid="added-state"
        aria-live="polite"
        className={
          'flex items-center justify-center gap-1.5 rounded-xl border border-green-600/30 bg-green-50 px-3 py-2 text-xs font-bold text-green-800 ' +
          className
        }
      >
        <Icon name="check" className="h-3.5 w-3.5" />
        {addedLabel}
      </span>
    )
  }

  const base =
    tone === 'deep'
      ? 'bg-deep text-white shadow-sm hover:bg-ink'
      : 'bg-accent text-white shadow-sm shadow-accent/25 hover:bg-accent-600'

  return (
    <button
      type="button"
      onClick={onAdd}
      className={`rounded-xl px-3 py-2 text-xs font-bold ${base} ${PRESSABLE} ${className}`}
    >
      {label}
    </button>
  )
}
