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
      {/* Swept wing, raked back from the fuselage. */}
      <path d="M12.2 7.1h5.6L9.9 1.5H6.4z" />
      {/* Fuselage: the crossbar of the T, tapering to a nose on the right. */}
      <path d="M5.1 7.1h19.2l5.3 1.75-5.3 1.75H5.1a1.75 1.75 0 0 1 0-3.5z" />
      {/* Pin: the stem of the T, with its eye cut out rather than filled over. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 12.7a6.6 6.6 0 0 0-6.6 6.6c0 4.7 6.6 10.2 6.6 10.2s6.6-5.5 6.6-10.2A6.6 6.6 0 0 0 16 12.7zm0 9.1a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
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
