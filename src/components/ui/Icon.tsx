import type { ReactElement, SVGProps } from 'react'

export type IconName =
  | 'plane'
  | 'plane-return'
  | 'bed'
  | 'ticket'
  | 'map'
  | 'compass'
  | 'wifi'
  | 'kitchen'
  | 'snowflake'
  | 'pool'
  | 'parking'
  | 'coffee'
  | 'washer'
  | 'paw'
  | 'info'
  | 'calendar'
  | 'users'
  | 'check'
  | 'clock'
  | 'pin'
  | 'new-chat'
  | 'arrow-right'

/**
 * One stroked line-icon set, drawn on a 24-grid at 1.7 weight.
 *
 * Emoji were doing this job before. They render as somebody else's artwork — different on every
 * platform, coloured, and childish next to a serif display face.
 */
const PATHS: Record<IconName, ReactElement> = {
  plane: <path d="M3.5 12.5 21 5l-4 8 4 8-17.5-7.5" />,
  'plane-return': (
    <>
      <path d="M21 6 3.5 12l4.5 2" />
      <path d="M3 18h18" />
      <path d="m8 14 3 4 10-6" />
    </>
  ),
  bed: (
    <>
      <path d="M3 18V7" />
      <path d="M3 12h18v6" />
      <path d="M21 18v-4a2 2 0 0 0-2-2" />
      <circle cx="7.5" cy="9.5" r="1.6" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5Z" />
      <path d="M13 6v12" strokeDasharray="2 2.5" />
    </>
  ),
  map: (
    <>
      <path d="m9 4-6 2.5v13L9 17l6 3 6-2.5v-13L15 7Z" />
      <path d="M9 4v13M15 7v13" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 5.3-5.3 2.2 2.2-5.3Z" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a15 15 0 0 1 19 0" />
      <path d="M6 12.5a10 10 0 0 1 12 0" />
      <path d="M9.5 16a5 5 0 0 1 5 0" />
      <circle cx="12" cy="19.5" r="0.6" fill="currentColor" />
    </>
  ),
  kitchen: (
    <>
      <path d="M6 3v8a2 2 0 0 0 4 0V3" />
      <path d="M8 11v10" />
      <path d="M17 3c-1.5 1.5-2 3-2 5s.5 2.5 2 2.5V21" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
      <path d="m9.5 4.8 2.5 2 2.5-2M9.5 19.2l2.5-2 2.5 2" />
    </>
  ),
  pool: (
    <>
      <path d="M2.5 16c2 0 2-1.4 4-1.4s2 1.4 4 1.4 2-1.4 4-1.4 2 1.4 4 1.4M2.5 20c2 0 2-1.4 4-1.4s2 1.4 4 1.4 2-1.4 4-1.4 2 1.4 4 1.4" />
      <path d="M7 14V5a2 2 0 0 1 4 0M13 14V5a2 2 0 0 1 4 0" />
    </>
  ),
  parking: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M10 16V8h2.8a2.6 2.6 0 0 1 0 5.2H10" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" />
      <path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M7 3.5v2M11 3.5v2" />
    </>
  ),
  washer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <circle cx="12" cy="14" r="4" />
      <path d="M7.5 6.5h.01M11 6.5h.01" />
    </>
  ),
  paw: (
    <>
      <ellipse cx="7" cy="9" rx="1.8" ry="2.3" />
      <ellipse cx="12" cy="7" rx="1.8" ry="2.3" />
      <ellipse cx="17" cy="9" rx="1.8" ry="2.3" />
      <path d="M12 12c-3 0-5 2-5 4.2S9 20 12 20s5-1.6 5-3.8S15 12 12 12Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 6.3M17 14.2a5.5 5.5 0 0 1 3.5 4.8" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.2 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  /* A speech bubble with a plus: a new conversation, not just a new document. */
  'new-chat': (
    <>
      <path d="M20.5 12.8a8.5 8.5 0 0 1-12.2 7.7L3.5 21.5l1.1-4.6A8.5 8.5 0 1 1 20.5 12.8Z" />
      <path d="M12 9.2v5.2M9.4 11.8h5.2" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4.5 12h14.5" />
      <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
    </>
  ),
}

export function Icon({
  name,
  className = 'h-4 w-4',
  ...rest
}: { name: IconName; className?: string } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
