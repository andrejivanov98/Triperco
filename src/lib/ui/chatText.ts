export interface ChatSpan {
  text: string
  strong: boolean
}

export interface ChatBlock {
  type: 'paragraph' | 'bullets'
  /** Set on paragraphs. */
  spans: ChatSpan[]
  /** Set on bullet blocks: one span list per item. */
  items?: ChatSpan[][]
}

const BULLET = /^\s*(?:[-*•]\s+|\d+[.)]\s+)/
const HEADING = /^\s*#{1,6}\s+/
const TABLE_ROW = /^\s*\|.*\|?\s*$/
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

/** `[label](url)` → `label`; `` `code` `` → `code`. */
function stripSyntax(line: string): string {
  return line
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

/**
 * Split a line into plain and emphasized spans. Emphasis markers must be paired and non-empty,
 * so a stray `5*` stays literal text.
 */
function toSpans(line: string, allStrong = false): ChatSpan[] {
  const text = stripSyntax(line)
  const spans: ChatSpan[] = []
  const pattern = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_/g

  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      spans.push({ text: text.slice(cursor, match.index), strong: allStrong })
    }
    const inner = match[1] ?? match[2] ?? match[3] ?? match[4]
    spans.push({ text: inner, strong: true })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor), strong: allStrong })

  return spans.filter((s) => s.text.length > 0)
}

/**
 * Parse assistant text into renderable blocks. Markdown markers never survive: emphasis becomes
 * spans, lists become bullet blocks, and headings/tables/rules are stripped. Chat should read as
 * conversation — structured trip data belongs in cards.
 */
export function parseChatText(raw: string): ChatBlock[] {
  const blocks: ChatBlock[] = []
  let bullets: ChatSpan[][] | null = null

  const flush = () => {
    if (bullets?.length) blocks.push({ type: 'bullets', spans: [], items: bullets })
    bullets = null
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || RULE.test(trimmed) || TABLE_ROW.test(trimmed)) {
      flush()
      continue
    }

    if (BULLET.test(trimmed)) {
      const spans = toSpans(trimmed.replace(BULLET, ''))
      if (spans.length) (bullets ??= []).push(spans)
      continue
    }

    flush()
    if (HEADING.test(trimmed)) {
      // A heading is just an emphasized line in a chat bubble.
      const spans = toSpans(trimmed.replace(HEADING, ''), true)
      if (spans.length) blocks.push({ type: 'paragraph', spans })
      continue
    }

    const spans = toSpans(trimmed)
    if (spans.length) blocks.push({ type: 'paragraph', spans })
  }

  flush()
  return blocks
}
