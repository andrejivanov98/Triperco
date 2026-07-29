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
        The vapour trail: one round-capped stroke lifting left to right, so the eye travels the way
        the plane is going. Together with the plane it forms the crossbar of the T.
      */}
      <path
        d="M3.1 12.4C7.4 10.8 11.7 9.8 16 9.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      {/*
        The plane as a folded paper dart, stroked with round joins so every corner is blunted.
        Sharp swept angles read as military; blunt ones read as paper.
      */}
      <path
        d="M29.2 3.8 17.6 9.9l4.4 1 1.1 3.6z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Pin: the stem of the T, with its eye cut out rather than filled over. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 14a6.3 6.3 0 0 0-6.3 6.3c0 4.5 6.3 9.7 6.3 9.7s6.3-5.2 6.3-9.7A6.3 6.3 0 0 0 16 14zm0 8.8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
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
