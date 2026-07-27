'use client'

import { useEffect, useState } from 'react'

/**
 * A provider-supplied photo.
 *
 * Data-driven hosts can't go through next/image (they'd all need allowlisting), and some of them
 * refuse requests that carry a referrer, so we send none. If a URL is dead or blocked we fall back
 * to a glyph tile rather than leaving a broken frame.
 */
export function RemoteImage({
  src,
  alt,
  className = '',
  fallbackGlyph = '📷',
  fallbackClassName = '',
}: {
  src?: string
  alt: string
  className?: string
  fallbackGlyph?: string
  fallbackClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  // A new url deserves a new chance.
  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-accent-050 to-sand text-2xl ${className} ${fallbackClassName}`}
      >
        <span aria-hidden="true">{fallbackGlyph}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
