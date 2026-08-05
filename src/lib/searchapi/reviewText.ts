/**
 * Clean up the text of a review before it becomes part of the app.
 *
 * Provider review bodies are HTML fragments, not plain text. They arrive carrying `<br>` runs, the
 * occasional `<b>`, and HTML entities — and every one of those rendered literally, so a traveler read
 * "great market<br><br>bring cash" on the card. React escapes the markup (nothing here is an
 * injection risk), which is exactly why it showed up as visible characters instead.
 *
 * Emoji are left alone. They are how people actually write reviews, and stripping them would make
 * the quotes read like they had been through a machine.
 */

/** `<br>`, `<br/>`, `<br />`, `</p><p>` — anything that means "new line" in a fragment. */
const LINE_BREAK = /<\s*br\s*\/?\s*>|<\s*\/\s*p\s*>\s*<\s*p[^>]*>/gi

/** Any remaining tag. Reviews have no markup worth keeping. */
const ANY_TAG = /<\/?[a-z][^>]*>/gi

/** The handful of entities that actually turn up in review bodies. */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#039;': "'",
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
}

function decodeEntities(text: string): string {
  return text
    .replace(/&[a-z#0-9]+;/gi, (match) => ENTITIES[match.toLowerCase()] ?? match)
    // Numeric escapes the table does not name, e.g. &#8217;
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

/**
 * A review body as prose. Line breaks become single spaces: these are shown clamped to two lines on
 * a card and as a short blockquote in the panel, so preserving a nine-paragraph structure would only
 * produce a wall of white space.
 *
 * Returns an empty string when nothing readable survives, so callers can drop the review entirely.
 */
export function sanitizeReviewText(raw: string | undefined): string {
  if (!raw) return ''
  return decodeEntities(raw.replace(LINE_BREAK, ' ').replace(ANY_TAG, ' '))
    // Collapse the runs the substitutions above leave behind.
    .replace(/\s+/g, ' ')
    // Providers wrap some bodies in their own quotes; ours are added by the blockquote.
    .replace(/^["“'']+|["”'']+$/g, '')
    .trim()
}
