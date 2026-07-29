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
        The flight path: a light, round-capped curve climbing out to the right. Deliberately thinner
        than everything else — it is the line the eye follows, not a thing in itself.
      */}
      <path
        d="M2.9 12.7C8.2 9.6 13.8 8.4 19.1 8.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/*
        The plane at the end of it: a solid airliner seen from above, banked along the climb. Drawn
        upright on its own 24-grid and placed by transform, so the silhouette stays exact rather than
        being hand-rotated into approximate coordinates.
      */}
      <g transform="translate(23.4 7.1) rotate(45) scale(0.55) translate(-12 -12)">
        <path d="M21.5 15.6v-1.9l-8.2-5.1V3.1a1.3 1.3 0 0 0-2.6 0v5.5l-8.2 5.1v1.9l8.2-2.6v5.6l-2.2 1.6v1.6l3.5-1 3.5 1v-1.6l-2.2-1.6V13z" />
      </g>
      {/* The pin: the stem of the T, its eye cut out rather than filled over. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 14.4a6.4 6.4 0 0 0-6.4 6.4c0 4.6 6.4 9.8 6.4 9.8s6.4-5.2 6.4-9.8a6.4 6.4 0 0 0-6.4-6.4zm0 8.9a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
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
