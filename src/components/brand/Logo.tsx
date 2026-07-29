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
 * The lockup: the mark lives inside the name.
 *
 * "Triperc" is set in the display serif and the final o is a location pin, so the word ends
 * somewhere rather than just ending. A flight path lifts off the T, arcs over the whole name and
 * comes down onto that pin with the plane at the arrival end — the journey the product describes,
 * drawn across its own name.
 *
 * It is one SVG rather than text with decoration on top, so the curve, the plane and the pin stay
 * in the same coordinate space and cannot drift apart at any size. `textLength` pins the word's
 * advance width, so even if the display face fails to load the pin still lands where the o belongs.
 */
export function Logo({
  className = '',
  markClassName = 'h-7',
  showWordmark = true,
}: {
  className?: string
  /** Sizes the lockup by height; the width follows. */
  markClassName?: string
  /** False renders the standalone mark, for favicons and tight corners. */
  showWordmark?: boolean
}) {
  if (!showWordmark) {
    return <LogoMark className={`h-7 w-7 text-deep ${className}`} />
  }

  return (
    <svg
      viewBox="0 0 176 54"
      role="img"
      aria-label="Triperco"
      fill="currentColor"
      className={`w-auto text-deep ${markClassName} ${className}`}
    >
      {/* The flight path, lifting off the T and arcing over the name. */}
      <path
        d="M5 13C45 1 105 1 136.5 7.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {/* The plane at the arrival end, nose down toward the pin. */}
      <path
        d="M151.6 12.5L146.7 11.8L138.2 14.3L137.8 13.6L142.3 10.2L138.7 8.9L137 10.3L136.6 9.8L137.5 7.4L138.4 5L139 4.8L139.3 7L143 8.3L141.7 2.9L142.4 2.6L147.4 9.9Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <text
        x="0"
        y="40"
        textLength="150"
        lengthAdjust="spacing"
        fontSize="40"
        className="font-display"
        /* No letter-spacing here: textLength already distributes the fit, and the two fight. */
        style={{ fontWeight: 600 }}
      >
        Triperc
      </text>

      {/* The final o: a pin whose bowl sits on the x-height and whose point drops below the line. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M160 18a10 10 0 0 0-10 10c0 7.3 10 18 10 18s10-10.7 10-18a10 10 0 0 0-10-10zm0 14.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4z"
      />
    </svg>
  )
}
