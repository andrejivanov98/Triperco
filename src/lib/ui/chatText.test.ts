import { describe, it, expect } from 'vitest'
import { parseChatText } from './chatText'

describe('parseChatText', () => {
  it('turns a plain paragraph into one block', () => {
    expect(parseChatText('Rome in May is lovely.')).toEqual([
      { type: 'paragraph', spans: [{ text: 'Rome in May is lovely.', strong: false }] },
    ])
  })

  it('renders bold as spans, never as literal asterisks', () => {
    const [block] = parseChatText('I found **Hotel Artemide** for you.')
    expect(block).toEqual({
      type: 'paragraph',
      spans: [
        { text: 'I found ', strong: false },
        { text: 'Hotel Artemide', strong: true },
        { text: ' for you.', strong: false },
      ],
    })
  })

  it('handles __bold__ and single-asterisk emphasis too', () => {
    const spans = parseChatText('__Nonstop__ and *cheapest*')[0]
    expect(spans).toEqual({
      type: 'paragraph',
      spans: [
        { text: 'Nonstop', strong: true },
        { text: ' and ', strong: false },
        { text: 'cheapest', strong: true },
      ],
    })
  })

  it('leaves an unpaired asterisk alone rather than eating the text', () => {
    const [block] = parseChatText('A 5* hotel')
    expect(block.spans.map((s) => s.text).join('')).toBe('A 5* hotel')
  })

  it('groups consecutive dash lines into one bullet block', () => {
    const blocks = parseChatText('Here you go:\n- Flights\n- A stay\n* Things to do\nAnything else?')
    expect(blocks).toHaveLength(3)
    expect(blocks[0].type).toBe('paragraph')
    expect(blocks[1].type).toBe('bullets')
    expect(blocks[1].items?.map((i) => i.map((s) => s.text).join(''))).toEqual([
      'Flights',
      'A stay',
      'Things to do',
    ])
    expect(blocks[2].type).toBe('paragraph')
  })

  it('reads numbered lists as bullets', () => {
    const blocks = parseChatText('1. Book the flight\n2. Book the hotel')
    expect(blocks[0].type).toBe('bullets')
    expect(blocks[0].items).toHaveLength(2)
  })

  it('strips heading markers but keeps the words', () => {
    const [block] = parseChatText('## Your Rome trip')
    expect(block.type).toBe('paragraph')
    expect(block.spans[0]).toEqual({ text: 'Your Rome trip', strong: true })
  })

  it('renders a markdown link as its label, without the url syntax', () => {
    const [block] = parseChatText('Check [the museum](https://x.com/y) hours.')
    expect(block.spans.map((s) => s.text).join('')).toBe('Check the museum hours.')
  })

  it('drops table rows and horizontal rules entirely', () => {
    const blocks = parseChatText('Options:\n| Hotel | Price |\n| --- | --- |\n---\nPick one.')
    const text = blocks.flatMap((b) => b.spans ?? []).map((s) => s.text)
    expect(text.join(' ')).not.toContain('|')
    expect(blocks).toHaveLength(2)
  })

  it('collapses blank lines and trims', () => {
    expect(parseChatText('  One.\n\n\nTwo.  ')).toHaveLength(2)
  })

  it('returns nothing for empty input', () => {
    expect(parseChatText('')).toEqual([])
    expect(parseChatText('   \n  ')).toEqual([])
  })

  it('unwraps inline code ticks', () => {
    const [block] = parseChatText('Use `SKP` as the airport.')
    expect(block.spans.map((s) => s.text).join('')).toBe('Use SKP as the airport.')
  })
})

/**
 * The model occasionally emits something that is not conversation at all — a fenced block, a raw
 * payload, a half-written tool call. None of it is ever useful to a traveler, and rendering it
 * literally is the single worst thing the chat can do, so it never survives parsing.
 */
describe('parseChatText — code and payloads never render', () => {
  it('drops a fenced block whole, keeping the prose around it', () => {
    const blocks = parseChatText(
      'Here are your flights:\n```json\n{"flights": [{"price": 120}]}\n```\nThe first is cheapest.',
    )
    const text = blocks.flatMap((b) => b.spans ?? []).map((s) => s.text).join(' ')
    expect(text).toContain('Here are your flights:')
    expect(text).toContain('The first is cheapest.')
    expect(text).not.toContain('{')
    expect(text).not.toContain('price')
  })

  it('drops an unterminated fence and everything after it', () => {
    const blocks = parseChatText('Found 12 stays.\n```\nconst x = await search()')
    const text = blocks.flatMap((b) => b.spans ?? []).map((s) => s.text).join(' ')
    expect(text).toBe('Found 12 stays.')
  })

  it('drops a fence marker carrying a language tag on its own line', () => {
    expect(parseChatText('```typescript\nexport const a = 1\n```')).toEqual([])
  })

  it('drops a bare JSON object or array, even unfenced', () => {
    expect(parseChatText('{"tool": "searchFlights", "args": {"departure_id": "SKP"}}')).toEqual([])
    expect(parseChatText('[{"id": "f1"}, {"id": "f2"}]')).toEqual([])
  })

  it('drops a line that is only a function or tool call', () => {
    expect(parseChatText('searchFlights({"departure_id": "SKP"})')).toEqual([])
    expect(parseChatText('print(results)')).toEqual([])
  })

  it('drops xml-ish tool tags the provider sometimes leaks', () => {
    const blocks = parseChatText(
      '<tool_call>\n{"name": "searchHotels"}\n</tool_call>\n14 stays in Trastevere.',
    )
    const text = blocks.flatMap((b) => b.spans ?? []).map((s) => s.text).join(' ')
    expect(text).toBe('14 stays in Trastevere.')
  })

  it('keeps prose that merely mentions braces or code words', () => {
    const [block] = parseChatText('The hotel is on Via del Corso (near the {old} quarter).')
    expect(block.spans.map((s) => s.text).join('')).toContain('Via del Corso')
  })

  it('keeps a price that starts a sentence, which is not a payload', () => {
    const [block] = parseChatText('$180 a night, breakfast included.')
    expect(block.spans.map((s) => s.text).join('')).toBe('$180 a night, breakfast included.')
  })
})
