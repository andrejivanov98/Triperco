const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Strict YYYY-MM-DD → epoch ms at UTC midnight, or null. */
function parseISO(s?: string): number | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const [, y, mo, d] = m
  const ts = Date.UTC(Number(y), Number(mo) - 1, Number(d))
  const dt = new Date(ts)
  // reject overflow (e.g. 2026-02-31)
  if (dt.getUTCMonth() !== Number(mo) - 1 || dt.getUTCDate() !== Number(d)) return null
  return ts
}

const DAY = 86_400_000

function toISO(ts: number): string {
  const d = new Date(ts)
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${mo}-${day}`
}

/** Inclusive list of ISO dates from start..end; [] if unparseable or end<start. */
export function enumerateDates(start?: string, end?: string): string[] {
  const a = parseISO(start)
  const b = parseISO(end)
  if (a === null || b === null || b < a) return []
  const out: string[] = []
  for (let ts = a; ts <= b; ts += DAY) out.push(toISO(ts))
  return out
}

/** "Tue, Sep 1" — deterministic, locale-independent. Falls back to input if unparseable. */
export function formatDayLabel(iso?: string): string {
  const ts = parseISO(iso)
  if (ts === null) return iso ?? ''
  const d = new Date(ts)
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** "Sep 1 – 15" (same month) or "Sep 28 – Oct 2" (crossing months). */
export function formatDateRange(start?: string, end?: string): string {
  const a = parseISO(start)
  const b = parseISO(end)
  if (a === null || b === null) return ''
  const da = new Date(a)
  const db = new Date(b)
  const left = `${MONTHS[da.getUTCMonth()]} ${da.getUTCDate()}`
  const right =
    da.getUTCMonth() === db.getUTCMonth()
      ? `${db.getUTCDate()}`
      : `${MONTHS[db.getUTCMonth()]} ${db.getUTCDate()}`
  return `${left} – ${right}`
}

/** Whole nights between two ISO dates, or undefined if unparseable. */
export function nightsBetween(start?: string, end?: string): number | undefined {
  const a = parseISO(start)
  const b = parseISO(end)
  if (a === null || b === null) return undefined
  return Math.round((b - a) / DAY)
}
