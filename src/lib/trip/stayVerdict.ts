import type { Stay, ReviewSnippet } from './types'

/**
 * One thing reviewers agree on, grounded in what the provider actually reported.
 *
 * We never write the characterisation ourselves — the counts carry the credibility and a
 * reviewer's own words carry the colour. That way a watch-out can be wrong about emphasis but
 * never invented.
 */
export interface StayFinding {
  /** What they were talking about, e.g. "Location". */
  topic: string
  positive?: number
  negative?: number
  /** A reviewer's own words on this topic. Never attributed — the name is nobody's business. */
  quote?: string
}

export interface StayVerdict {
  loved: StayFinding[]
  watchOuts: StayFinding[]
  /** Things the provider says are absent that travelers routinely look for. */
  missing: string[]
}

/** Below this a split is noise: three people disagreeing is not a pattern. */
const MIN_MENTIONS = 8
/** A quarter of mentions going negative is worth warning about. */
const NEGATIVE_SHARE = 0.25
/** Near-unanimous praise is what makes a pro worth printing. */
const POSITIVE_SHARE = 0.85
const MAX_FINDINGS = 4
const QUOTE_LIMIT = 180

/** Amenities whose absence changes plans, rather than every checkbox the provider tracks. */
const NOTABLE_ABSENCES = [
  /parking/i,
  /air.?condition/i,
  /wi.?fi|internet/i,
  /pool/i,
  /breakfast/i,
  /elevator|lift/i,
  /kitchen/i,
  /gym|fitness/i,
  /pet/i,
  /accessib|wheelchair/i,
]

function titleCase(name: string): string {
  const clean = name.trim().replace(/[_-]+/g, ' ')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

/** One sentence at most, trimmed on a word boundary, with the reviewer's line breaks removed. */
function toQuote(text: string): string | undefined {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length === 0) return undefined
  if (clean.length <= QUOTE_LIMIT) return clean
  const cut = clean.slice(0, QUOTE_LIMIT)
  const space = cut.lastIndexOf(' ')
  return (space > QUOTE_LIMIT * 0.5 ? cut.slice(0, space) : cut).trimEnd() + '…'
}

/**
 * The review that speaks to this topic, leaning to a critical voice for a watch-out and a warm one
 * for a pro. Returns nothing rather than a quote that isn't about the topic.
 */
function quoteFor(
  topic: string,
  snippets: ReviewSnippet[] | undefined,
  tone: 'positive' | 'negative',
): string | undefined {
  const word = topic.trim().toLowerCase()
  if (word.length < 3) return undefined
  const matches = (snippets ?? []).filter((s) => s.text?.toLowerCase().includes(word))
  if (matches.length === 0) return undefined

  const scored = [...matches].sort((a, b) => {
    const ra = a.rating ?? 5
    const rb = b.rating ?? 5
    return tone === 'negative' ? ra - rb : rb - ra
  })
  return toQuote(scored[0].text)
}

function share(part: number | undefined, of: number): number | undefined {
  return of > 0 && part !== undefined ? part / of : undefined
}

/**
 * Derive what guests love and what to watch out for. Returns empty lists when the material is
 * thin — an empty verdict is honest, an invented one is not.
 */
export function stayVerdict(stay: Stay): StayVerdict {
  const loved: StayFinding[] = []
  const watchOuts: StayFinding[] = []

  for (const topic of stay.reviewTopics ?? []) {
    const positive = typeof topic.positive === 'number' ? topic.positive : undefined
    const negative = typeof topic.negative === 'number' ? topic.negative : undefined
    const decided = (positive ?? 0) + (negative ?? 0)
    if (decided < MIN_MENTIONS) continue

    const name = titleCase(topic.name)
    const negativeShare = share(negative, decided)
    const positiveShare = share(positive, decided)

    if (negativeShare !== undefined && negativeShare >= NEGATIVE_SHARE) {
      watchOuts.push({ topic: name, positive, negative, quote: quoteFor(topic.name, stay.reviewSnippets, 'negative') })
      continue
    }
    if (positiveShare !== undefined && positiveShare >= POSITIVE_SHARE) {
      loved.push({ topic: name, positive, negative, quote: quoteFor(topic.name, stay.reviewSnippets, 'positive') })
    }
  }

  // Most-discussed first: a split 300 people noticed matters more than one 9 people noticed.
  const byWeight = (a: StayFinding, b: StayFinding) =>
    (b.positive ?? 0) + (b.negative ?? 0) - ((a.positive ?? 0) + (a.negative ?? 0))

  const missing = (stay.excludedAmenities ?? [])
    .map((a) => a.trim())
    .filter((a) => a.length > 0 && NOTABLE_ABSENCES.some((pattern) => pattern.test(a)))

  return {
    loved: loved.sort(byWeight).slice(0, MAX_FINDINGS),
    watchOuts: watchOuts.sort(byWeight).slice(0, MAX_FINDINGS),
    missing: [...new Set(missing)].slice(0, MAX_FINDINGS),
  }
}

/** True when there is something real to show. */
export function hasVerdict(verdict: StayVerdict): boolean {
  return verdict.loved.length > 0 || verdict.watchOuts.length > 0 || verdict.missing.length > 0
}

/** "240 said yes, 18 said no" — the evidence line under a finding. */
export function findingEvidence(finding: StayFinding): string | undefined {
  const parts: string[] = []
  if (finding.positive) parts.push(`${finding.positive.toLocaleString()} positive`)
  if (finding.negative) parts.push(`${finding.negative.toLocaleString()} negative`)
  return parts.length > 0 ? parts.join(' · ') : undefined
}
