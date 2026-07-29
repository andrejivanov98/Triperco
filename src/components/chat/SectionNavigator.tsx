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
}: {
  sections: ChatSection[]
  /** Whichever section is currently in view. */
  activeId?: string
  onJump: (id: string) => void
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
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="section-navigator"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Jump to a part of this conversation"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[18rem] items-center gap-2 rounded-full border border-hairline bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm backdrop-blur transition hover:bg-white"
      >
        <span className="truncate">{current.label}</span>
        <span aria-hidden className="shrink-0 text-[9px] text-muted">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Parts of this conversation"
          className="absolute left-1/2 z-50 mt-2 max-h-80 w-72 -translate-x-1/2 overflow-y-auto rounded-2xl border border-hairline bg-white/95 shadow-xl backdrop-blur"
        >
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
                className="flex w-full items-center gap-2 border-t border-hairline px-4 py-3 text-left text-sm font-medium text-ink transition first:border-t-0 hover:bg-sand"
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
