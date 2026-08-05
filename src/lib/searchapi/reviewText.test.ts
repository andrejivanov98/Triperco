import { describe, it, expect } from 'vitest'
import { sanitizeReviewText } from './reviewText'

/** The real payload that surfaced this, trimmed. Provider bodies are HTML fragments. */
const REAL = `Mercado 28 is a fun place to explore if you’re looking for souvenirs and local vibes 🌴✨<br><br>There are lots of small shops selling handmade items, jewelry, clothes, and Mexican souvenirs.<br><br>Most shops accept cards, but I’d still recommend bringing some cash just in case 💳💵`

describe('sanitizeReviewText', () => {
  it('removes the <br> runs that were rendering literally', () => {
    const out = sanitizeReviewText(REAL)
    expect(out).not.toContain('<br>')
    expect(out).not.toContain('<')
    expect(out).toContain('Mercado 28 is a fun place to explore')
    expect(out).toContain('Most shops accept cards')
  })

  it('keeps the emoji, because that is how people write reviews', () => {
    expect(sanitizeReviewText(REAL)).toContain('🌴✨')
  })

  it('leaves one space where a break was, never a jammed-together word', () => {
    expect(sanitizeReviewText('First line.<br><br>Second line.')).toBe('First line. Second line.')
  })

  it('handles every spelling of a line break', () => {
    expect(sanitizeReviewText('a<br>b<br/>c<br />d<BR>e')).toBe('a b c d e')
  })

  it('strips any other markup that turns up', () => {
    expect(sanitizeReviewText('<b>Great</b> value, <i>very</i> clean')).toBe('Great value, very clean')
  })

  it('treats a paragraph boundary as a break', () => {
    expect(sanitizeReviewText('<p>One.</p><p>Two.</p>')).toBe('One. Two.')
  })

  it('decodes the entities that actually appear', () => {
    expect(sanitizeReviewText('Bed &amp; breakfast')).toBe('Bed & breakfast')
    expect(sanitizeReviewText('It&#39;s lovely')).toBe("It's lovely")
    expect(sanitizeReviewText('Nice&nbsp;and&nbsp;quiet')).toBe('Nice and quiet')
    expect(sanitizeReviewText('It&#8217;s fine')).toBe('It’s fine')
  })

  /**
   * A review body is text a stranger typed. Decoding this unguarded threw a RangeError, which failed
   * the whole place search rather than the one quote.
   */
  it('leaves a numeric escape that is not a character alone, instead of throwing', () => {
    expect(sanitizeReviewText('Great spot &#99999999; really')).toBe('Great spot &#99999999; really')
    expect(sanitizeReviewText('Odd &#1114112; one')).toBe('Odd &#1114112; one')
    expect(sanitizeReviewText('Zero &#0; here')).toBe('Zero &#0; here')
  })

  it('still decodes the boundary code point', () => {
    expect(sanitizeReviewText('End &#1114111;')).toBe(`End ${String.fromCodePoint(0x10ffff)}`)
  })

  it('drops the provider’s own wrapping quotes', () => {
    expect(sanitizeReviewText('"Breakfast was included."')).toBe('Breakfast was included.')
  })

  it('collapses runaway whitespace', () => {
    expect(sanitizeReviewText('  Lots   of\n\n  space  ')).toBe('Lots of space')
  })

  it('is empty when nothing readable survives, so the review can be dropped', () => {
    expect(sanitizeReviewText('<br><br>')).toBe('')
    expect(sanitizeReviewText('   ')).toBe('')
    expect(sanitizeReviewText(undefined)).toBe('')
  })

  it('leaves ordinary prose untouched', () => {
    expect(sanitizeReviewText('Spotless and central.')).toBe('Spotless and central.')
  })

  it('does not mangle a stray angle bracket in real prose', () => {
    expect(sanitizeReviewText('Rooms < 20m2 feel tight')).toBe('Rooms < 20m2 feel tight')
  })
})
