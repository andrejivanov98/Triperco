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

/*
 * A model can emit something that is not conversation at all: a fenced block, a raw payload, a
 * half-written tool call, a leaked provider tag. None of it means anything to a traveler, and
 * rendering it literally is the worst thing this chat can do — so none of it survives parsing.
 *
 * These patterns match a whole line only. Prose that merely mentions a brace or a bracket is
 * conversation and must come through untouched, so nothing here looks inside a line of text.
 */

/** ``` or ~~~, with or without a language tag. */
const FENCE = /^\s*(?:```|~~~)/

/*
 * A JSON payload, in any of the shapes one arrives in: a brace or bracket alone on a line, a
 * closing one, a `"key":` pair, or a whole object/array on one line.
 *
 * Opening a line with `{` or `[` is not enough on its own — `[the museum](url) opens at nine` is
 * prose — so an opener must also carry a quoted key before the line is dropped.
 */
const PAYLOAD_LINE = /^\s*[{[]$|^\s*[}\]][,;]?$|^\s*"[\w-]+"\s*:|^\s*[{[].*"\s*:/

/** `searchFlights({…})`, `print(results)` — a bare call and nothing else. No space before the paren, so "Rome (the capital)" is prose. */
const CALL_ONLY = /^\s*[A-Za-z_$][\w$.]*\(.*\)[;,]?\s*$/

/** A line that is only an XML-ish tag, e.g. the `<tool_call>` wrappers some providers leak. */
const TAG_ONLY = /^\s*<\/?[A-Za-z_][\w:.-]*(?:\s[^>]*)?\/?>\s*$/

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
 *
 * Code, payloads and leaked tool tags never survive either. This runs on every token while the
 * answer streams, so a fenced block cannot flash on screen even for one frame before it is removed.
 */
export function parseChatText(raw: string): ChatBlock[] {
  const blocks: ChatBlock[] = []
  let bullets: ChatSpan[][] | null = null
  let inFence = false

  const flush = () => {
    if (bullets?.length) blocks.push({ type: 'bullets', spans: [], items: bullets })
    bullets = null
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()

    /*
     * A fence swallows everything up to its close. An unterminated one — which is exactly what a
     * truncated or still-streaming code block looks like — swallows the rest of the message, so
     * half-written code is never shown while it arrives.
     */
    if (FENCE.test(trimmed)) {
      flush()
      inFence = !inFence
      continue
    }
    if (inFence) continue

    if (PAYLOAD_LINE.test(trimmed) || CALL_ONLY.test(trimmed) || TAG_ONLY.test(trimmed)) {
      flush()
      continue
    }

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
