/**
 * Hand-built SVG illustrations for the category cards. Inline rather than files so they inherit the
 * palette, scale cleanly, and cost no extra request.
 */

const SAND = '#ECE6DA'
const TERRACOTTA = '#C2703D'
const CLAY = '#E3A76F'
const NAVY = '#14213A'
const SKY = '#7FC7E8'
const SUN = '#E8B44A'
const OLIVE = '#8A9A5B'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 160 160" className="h-full w-full" role="presentation" aria-hidden="true">
      {children}
    </svg>
  )
}

/** An arched doorway over a dune — a place to stay. */
export function StayIllustration() {
  return (
    <Frame>
      <path d="M50 118V72a30 30 0 0 1 60 0v46Z" fill={TERRACOTTA} />
      <path d="M66 118V74a14 14 0 0 1 28 0v44Z" fill={NAVY} opacity="0.85" />
      <circle cx="112" cy="44" r="12" fill={SUN} />
      <path d="M28 118c14-10 28 6 42-2s26 8 40 2 22 0 22 0v14H28Z" fill={SKY} opacity="0.75" />
      <path d="M28 132h124v10H28Z" fill={CLAY} opacity="0.5" />
      <path d="M42 96c6-6 4-16-2-20-2 8-6 12-8 20Z" fill={OLIVE} />
      <path d="M34 118V92" stroke={OLIVE} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  )
}

/** A plane arcing over a wave — flights. */
export function FlightIllustration() {
  return (
    <Frame>
      <circle cx="52" cy="48" r="15" fill={SUN} />
      <path d="M132 40 96 66l-16-6 12 20-10 12 22-6 18 8Z" fill={TERRACOTTA} />
      <path
        d="M24 122c20 0 30-18 52-18s34 12 60 12"
        stroke={CLAY}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 138c22 0 32-14 54-14s36 10 62 10"
        stroke={NAVY}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path d="M40 100c14-4 26 4 40 2" stroke={SKY} strokeWidth="6" strokeLinecap="round" fill="none" />
    </Frame>
  )
}

/** A folded map with a route — things to do. */
export function ThingsToDoIllustration() {
  return (
    <Frame>
      <rect x="36" y="30" width="88" height="100" rx="10" fill="#FBF8F1" stroke={SAND} strokeWidth="3" />
      <path d="M36 62c18-8 26 6 44-2s26 6 44-2" stroke={SKY} strokeWidth="4" fill="none" opacity="0.7" />
      <path
        d="M56 112c10-14 26-6 30-22s16-14 24-22"
        stroke={TERRACOTTA}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="1 9"
        fill="none"
      />
      <circle cx="58" cy="110" r="7" fill={OLIVE} />
      <circle cx="88" cy="86" r="6" fill={NAVY} />
      <path d="M110 62l4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" fill={SUN} />
      <path d="M124 118c8 4 14 4 20 0-4 10-14 12-20 6Z" fill={CLAY} />
    </Frame>
  )
}

/** A looping path around a sun — destinations. */
export function DestinationsIllustration() {
  return (
    <Frame>
      <circle cx="104" cy="44" r="13" fill={SUN} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <path
          key={angle}
          d="M104 22v-8"
          stroke={SUN}
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${angle} 104 44)`}
        />
      ))}
      <path
        d="M40 118V72a14 14 0 0 1 28 0v22a14 14 0 0 0 28 0V60"
        stroke={TERRACOTTA}
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M28 134c22-8 34 6 56-2s30 6 48-2" stroke={SKY} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="46" cy="56" r="8" fill={NAVY} opacity="0.8" />
    </Frame>
  )
}
