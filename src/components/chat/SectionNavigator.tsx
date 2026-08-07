'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatSection } from '@/lib/ui/chatSections'
import { Icon } from '@/components/ui/Icon'

/**
 * A table of contents for the conversation.
 *
 * Six searches in, the flights are a long way above the restaurants and the only way back is to
 * scroll and hope. This names each set of results and jumps to it.
 */
export function SectionNavigator({
  sections,
  activeId,
  onJump,
  fullWidth = false,
  asSheet = false,
}: {
  sections: ChatSection[]
  /** Whichever section is currently in view. */
  activeId?: string
  onJump: (id: string) => void
  /**
   * Fill the row rather than sitting as a pill in the header.
   *
   * This is the phone shape. There is no room beside the plan and share buttons for a third control,
   * so on a narrow screen the navigator gets its own line above the conversation — which is also
   * where a table of contents belongs.
   */
  fullWidth?: boolean
  /**
   * Open the list as a bottom sheet rather than a dropdown.
   *
   * The phone shape again, and for two reasons. A list that opens *upward from the bottom* puts every
   * option under the thumb instead of at the top of a tall screen, which is what a native app does for
   * exactly this job. And it is fixed to the viewport, so it can never be clipped or pushed off by an
   * ancestor's overflow the way an absolutely-positioned dropdown can.
   */
  asSheet?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (sections.length === 0) return null

  const current = sections.find((s) => s.id === activeId) ?? sections[sections.length - 1]

  return (
    <div ref={ref} className={fullWidth ? 'relative w-full' : 'relative'}>
      <button
        type="button"
        data-testid="section-navigator"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Jump to a part of this conversation"
        onClick={() => setOpen((v) => !v)}
        className={
          'flex items-center gap-2 rounded-full border border-hairline bg-white/80 text-xs font-bold text-ink shadow-sm backdrop-blur transition active:scale-[0.99] hover:bg-white ' +
          (fullWidth
            ? 'min-h-11 w-full justify-between px-4 py-2.5'
            : 'max-w-[18rem] px-3.5 py-1.5')
        }
      >
        {/* Named on the phone, where the pill is the only clue that this jumps anywhere. */}
        {fullWidth && <Icon name="map" className="h-3.5 w-3.5 shrink-0 text-muted" />}
        <span className="truncate">{current.label}</span>
        <span aria-hidden className="shrink-0 text-[9px] text-muted">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/*
        A backdrop, so the sheet reads as a layer over the conversation and a tap anywhere closes it.
        The outside-press handler above covers the same ground; this is what makes it look deliberate.
      */}
      {open && asSheet && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-deep/25 backdrop-blur-[1px]"
        />
      )}

      {open && (
        <ul
          role="listbox"
          aria-label="Parts of this conversation"
          className={
            asSheet
              ? // Anchored to the bottom of the viewport, clear of the home indicator, with room to
                // scroll a long conversation's worth of searches without swallowing the whole screen.
                'fixed inset-x-2 bottom-0 z-50 max-h-[60dvh] overflow-y-auto overscroll-contain rounded-t-3xl border border-hairline bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur'
              : 'absolute z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-hairline bg-white/95 shadow-xl backdrop-blur ' +
                (fullWidth ? 'inset-x-0' : 'left-1/2 w-72 -translate-x-1/2')
          }
        >
          {asSheet && (
            <li aria-hidden className="sticky top-0 flex justify-center bg-white/95 pt-2.5 pb-1.5">
              <span className="h-1 w-10 rounded-full bg-hairline" />
            </li>
          )}
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                role="option"
                aria-selected={section.id === current.id}
                onClick={() => {
                  onJump(section.id)
                  setOpen(false)
                }}
                className={
                  'flex w-full items-center gap-2 border-t border-hairline px-4 text-left text-sm font-medium text-ink transition hover:bg-sand ' +
                  // A comfortable target on a phone; the header dropdown stays compact.
                  (asSheet ? 'min-h-12 py-3.5' : 'py-3 first:border-t-0')
                }
              >
                <span className="flex-1 truncate">{section.label}</span>
                {section.id === current.id && (
                  <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-accent" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
