'use client'

import { useState, type ReactNode } from 'react'

/**
 * The shell every guided prompt sits in: a titled card, one clean row per choice, a way to answer
 * in your own words, and a way out.
 *
 * These used to render as a bare list against the page, which read as part of the assistant's
 * message rather than as something to act on.
 */
export function GuidedCard({
  title,
  children,
  freeTextPlaceholder = '…write something else',
  onFreeText,
  onSkip,
  footerRight,
}: {
  title: string
  children: ReactNode
  freeTextPlaceholder?: string
  onFreeText?: (text: string) => void
  onSkip?: () => void
  /** e.g. the Next button on a multi-select. */
  footerRight?: ReactNode
}) {
  const [dismissed, setDismissed] = useState(false)
  const [text, setText] = useState('')

  if (dismissed) return null

  function submitFreeText() {
    const trimmed = text.trim()
    if (!trimmed || !onFreeText) return
    onFreeText(trimmed)
    setText('')
  }

  return (
    <div
      data-testid="guided-card"
      className="overflow-hidden rounded-[22px] border border-hairline bg-white/70 shadow-sm"
    >
      <div className="px-5 py-4">
        <p className="font-display text-lg leading-snug text-ink">{title}</p>
      </div>

      <div className="flex flex-col">{children}</div>

      {onFreeText && (
        <div className="flex items-center gap-2 border-t border-hairline px-5 py-2.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitFreeText()
              }
            }}
            placeholder={freeTextPlaceholder}
            aria-label={freeTextPlaceholder}
            className="flex-1 bg-transparent py-1.5 text-sm font-medium text-ink outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={submitFreeText}
            disabled={text.trim().length === 0}
            aria-label="Send this answer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep text-sm font-bold text-white transition hover:bg-ink disabled:opacity-30"
          >
            ↑
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-hairline px-5 py-2.5">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs font-semibold text-muted transition hover:text-ink"
        >
          Dismiss
        </button>
        {footerRight ??
          (onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-semibold text-muted transition hover:text-ink"
            >
              Skip
            </button>
          ))}
      </div>
    </div>
  )
}

/** One tappable choice inside a GuidedCard. */
export function GuidedRow({
  label,
  onClick,
  selected,
  showCheckbox = false,
}: {
  label: string
  onClick: () => void
  selected?: boolean
  showCheckbox?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={showCheckbox ? Boolean(selected) : undefined}
      className={
        'group flex w-full items-center gap-3 border-t border-hairline px-5 py-3.5 text-left transition ' +
        (selected ? 'bg-sand/70' : 'hover:bg-accent-050')
      }
    >
      {showCheckbox && (
        <span
          aria-hidden
          className={
            'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border text-[11px] font-bold ' +
            (selected ? 'border-deep bg-deep text-white' : 'border-hairline bg-white text-transparent')
          }
        >
          ✓
        </span>
      )}
      <span className="flex-1 text-[15px] font-medium text-ink">{label}</span>
      {!showCheckbox && (
        <span
          aria-hidden
          className="shrink-0 text-sm font-semibold text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
        >
          ›
        </span>
      )}
    </button>
  )
}
