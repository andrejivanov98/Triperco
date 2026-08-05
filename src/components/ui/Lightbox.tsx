'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { RemoteImage } from '@/components/ui/RemoteImage'

/** Full-screen photo viewer: arrows, keyboard, counter, click-out to close. */
export function Lightbox({
  photos,
  startIndex = 0,
  title,
  onClose,
}: {
  photos: string[]
  startIndex?: number
  title: string
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const count = photos.length

  const go = useCallback(
    (delta: number) => setIndex((current) => (current + delta + count) % count),
    [count],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  if (count === 0) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close photos"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-deep/90"
      />

      <div className="pointer-events-none relative flex h-full flex-col items-center justify-center p-4">
        <RemoteImage
          src={photos[index]}
          alt={`${title} photo ${index + 1} of ${count}`}
          className="max-h-[82vh] max-w-full rounded-2xl object-contain"
          fallbackClassName="h-64 w-64 rounded-2xl"
        />
        <div className="mt-3 text-xs font-bold uppercase tracking-wide text-white/80">
          {index + 1} / {count}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink transition hover:bg-white"
          >
            <Icon name="chevron-left" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink transition hover:bg-white"
          >
            <Icon name="chevron-right" className="h-5 w-5" />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-ink transition hover:bg-white"
      >
        Close ✕
      </button>
    </div>
  )
}
