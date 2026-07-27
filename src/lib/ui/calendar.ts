/** A day cell in a rendered month grid. `null` pads the leading blanks. */
export type MonthCell = { iso: string; day: number } | null

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Mon-first, matching how most of the world reads a travel calendar. */
export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

/** All cells for one month, Monday-first, with leading blanks for alignment. */
export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(Date.UTC(year, month, 1))
  // getUTCDay is Sunday-first; shift so Monday is 0.
  const lead = (first.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  const cells: MonthCell[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: toIso(year, month, day), day })
  }
  return cells
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

export interface DateRange {
  start?: string
  end?: string
}

/**
 * Click behaviour for a range picker: the first click sets the start, the second closes the range,
 * and a click before the start (or a third click) starts over.
 */
export function selectDate(range: DateRange, iso: string): DateRange {
  if (!range.start || range.end) return { start: iso }
  if (iso < range.start) return { start: iso }
  if (iso === range.start) return { start: iso }
  return { start: range.start, end: iso }
}

export function isInRange(range: DateRange, iso: string): boolean {
  if (!range.start || !range.end) return false
  return iso > range.start && iso < range.end
}

export function isEdge(range: DateRange, iso: string): boolean {
  return iso === range.start || iso === range.end
}

/** "Sep 1 – 5" or "Sep 28 – Oct 2"; a lone start reads "Sep 1". */
export function describeRange(range: DateRange): string {
  if (!range.start) return ''
  const startLabel = shortDate(range.start)
  if (!range.end) return startLabel
  const sameMonth = range.start.slice(0, 7) === range.end.slice(0, 7)
  const endLabel = sameMonth ? String(Number(range.end.slice(8, 10))) : shortDate(range.end)
  return `${startLabel} – ${endLabel}`
}

function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  const name = MONTH_NAMES[Number(month) - 1]?.slice(0, 3) ?? ''
  return `${name} ${Number(day)}`
}
