import type { SVGProps } from 'react'

/**
 * The Triperco mark: a jet's fuselage as the crossbar of a T, a map pin as its stem.
 *
 * One colour, one weight, no gradients. Every coordinate is explicit and every shape is a single
 * closed path — the pin's hole is cut with evenodd rather than stacked on a background colour, so
 * the mark stays clean on any surface and at any size.
 *
 * Read left to right it is a plane in flight arriving at a place; read as a whole it is a T.
 */
export function LogoMark({ className = 'h-7 w-7', ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {/*
        The flight path: a light, round-capped curve running in from the left and levelling off
        behind the tail. Deliberately the thinnest thing here — it is the line the eye follows, not
        an object in its own right.
      */}
      <path
        d="M2.6 10C6.4 8.9 11 8.5 15.8 8.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/*
        The aeroplane: a solid airliner seen from above, banked 10° so it flies along the trail
        rather than away from it. Together they are the crossbar of the T; the pin is its stem.

        Every vertex is computed along that banked axis rather than scaled from an upright glyph. A
        detailed icon rotated 45° collapses into a thin cross at this size — which is exactly what
        the previous attempt did. Here the fuselage keeps its width and the wings keep their sweep,
        so the shape still reads as an aircraft when the whole mark is 28px wide.
      */}
      <path
        d="M28.1 6.6L24.6 8L19.9 12.9L19.3 12.6L21.1 8.6L18.1 9.1L17.6 10.7L17.1 10.6L16.8 8.6L16.5 6.6L16.8 6.4L17.9 7.7L20.8 7.1L17.8 4L18.2 3.5L24.4 6.5Z"
        strokeWidth="0.9"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* The pin: the stem of the T, its eye cut out rather than filled over. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 13.6a5.6 5.6 0 0 0-5.6 5.6c0 4.1 5.6 9.2 5.6 9.2s5.6-5.1 5.6-9.2a5.6 5.6 0 0 0-5.6-5.6zm0 8a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8z"
      />
    </svg>
  )
}

/**
 * The full lockup. The wordmark uses the display serif at a tight track so it reads as a name
 * rather than as UI text.
 */
export function Logo({
  className = '',
  markClassName = 'h-7 w-7',
  showWordmark = true,
}: {
  className?: string
  markClassName?: string
  showWordmark?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-deep ${className}`}>
      <LogoMark className={markClassName} />
      {showWordmark && (
        <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[-0.02em]">
          Triperco
        </span>
      )}
    </span>
  )
}
