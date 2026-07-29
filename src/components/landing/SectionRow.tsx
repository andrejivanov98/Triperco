'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Heading } from '@/components/ui/Heading'

/** One card plus its gap. */
const STEP = 288

/**
 * A full-bleed, horizontally scrollable row. The track runs edge to edge so cards bleed off both
 * sides, while the heading and controls stay aligned with the page gutter.
 */
export function SectionRow({
  title,
  subtitle,
  cta,
  children,
}: {
  title: string
  subtitle?: string
  cta?: { label: string; href: string }
  children: ReactNode
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(max <= 1 || el.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    sync()
    const el = trackRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sync])

  function step(direction: -1 | 1) {
    const el = trackRef.current
    if (!el) return
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + direction * STEP))
    sync()
  }

  const arrow =
    'flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-white/80 text-sm font-bold text-ink transition hover:bg-white disabled:opacity-30'

  return (
    <section className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-[1500px] items-start justify-between gap-4 px-5 sm:px-8">
        <div>
          <Heading level={2} className="text-2xl">
            {title}
          </Heading>
          {subtitle && <p className="mt-1 text-sm font-medium text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 gap-2 pt-1">
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            onClick={() => step(-1)}
            disabled={atStart}
            className={arrow}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            onClick={() => step(1)}
            disabled={atEnd}
            className={arrow}
          >
            ›
          </button>
        </div>
      </div>

      {/*
        The first card starts level with the heading, not at the window edge: the left pad matches
        the centred gutter on wide screens and falls back to the page gutter on narrow ones. Cards
        still bleed off to the right, so the row reads as continuing past the fold.
      */}
      <div
        ref={trackRef}
        data-testid={`row-track-${title}`}
        onScroll={sync}
        className="no-scrollbar flex snap-x gap-5 overflow-x-auto scroll-smooth pb-2 pl-[max(1.25rem,calc((100vw-1500px)/2+1.25rem))] pr-5 sm:pl-[max(2rem,calc((100vw-1500px)/2+2rem))] sm:pr-8"
      >
        {children}
      </div>

      {cta && (
        <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-8">
          <Link href={cta.href} className="text-sm font-bold text-deep transition hover:text-accent">
            {cta.label} →
          </Link>
        </div>
      )}
    </section>
  )
}
