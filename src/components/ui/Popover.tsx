'use client'

import { useEffect, useRef } from 'react'

/** A small anchored panel that closes on outside click or Escape. */
export function Popover({
  open,
  onClose,
  label,
  children,
  align = 'left',
}: {
  open: boolean
  onClose: () => void
  label: string
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e: MouseEvent) => {
      const el = ref.current
      if (el && e.target instanceof Node && !el.contains(e.target)) onClose()
    }

    window.addEventListener('keydown', onKey)
    // Capture so a click on the trigger still toggles before we close.
    document.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={
        'absolute top-[calc(100%+0.5rem)] z-30 w-[19rem] rounded-3xl border border-hairline bg-surface p-2 shadow-xl ' +
        (align === 'right' ? 'right-0' : 'left-0')
      }
    >
      {children}
    </div>
  )
}
