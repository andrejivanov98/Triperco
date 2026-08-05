import { describe, it, expect } from 'vitest'
import { stayVerdict, hasVerdict, findingEvidence } from './stayVerdict'
import type { Stay } from './types'

function stay(over: Partial<Stay> = {}): Stay {
  return {
    id: 's1',
    name: 'Hotel Vander',
    source: 'hotel',
    pricePerNight: 140,
    nights: 3,
    photos: [],
    bookUrl: 'https://book/1',
    ...over,
  }
}

describe('stayVerdict — nothing invented', () => {
  it('says nothing when the provider gave us nothing', () => {
    const verdict = stayVerdict(stay())
    expect(verdict).toEqual({ loved: [], watchOuts: [], missing: [] })
    expect(hasVerdict(verdict)).toBe(false)
  })

  it('ignores a split too small to be a pattern', () => {
    const verdict = stayVerdict(
      stay({ reviewTopics: [{ name: 'location', positive: 3, negative: 2, total: 5 }] }),
    )
    expect(verdict.loved).toEqual([])
    expect(verdict.watchOuts).toEqual([])
  })

  it('ignores a topic with no positive or negative counts at all', () => {
    const verdict = stayVerdict(stay({ reviewTopics: [{ name: 'location', total: 400 }] }))
    expect(hasVerdict(verdict)).toBe(false)
  })
})

describe('stayVerdict — what guests love', () => {
  it('promotes a near-unanimous topic', () => {
    const verdict = stayVerdict(
      stay({ reviewTopics: [{ name: 'service', positive: 240, negative: 6, total: 246 }] }),
    )
    expect(verdict.loved).toEqual([{ topic: 'Service', positive: 240, negative: 6, quote: undefined }])
  })

  it('leaves a merely-positive topic out', () => {
    // 70% positive is not "what guests love", it is ordinary.
    const verdict = stayVerdict(
      stay({ reviewTopics: [{ name: 'rooms', positive: 70, negative: 30, total: 100 }] }),
    )
    expect(verdict.loved).toEqual([])
  })

  it('leads with the topic the most people discussed', () => {
    const verdict = stayVerdict(
      stay({
        reviewTopics: [
          { name: 'breakfast', positive: 20, negative: 1, total: 21 },
          { name: 'service', positive: 400, negative: 10, total: 410 },
        ],
      }),
    )
    expect(verdict.loved.map((f) => f.topic)).toEqual(['Service', 'Breakfast'])
  })

  it('shows at most four', () => {
    const topics = ['a-one', 'b-two', 'c-three', 'd-four', 'e-five'].map((name, i) => ({
      name,
      positive: 100 - i,
      negative: 2,
      total: 102,
    }))
    expect(stayVerdict(stay({ reviewTopics: topics })).loved).toHaveLength(4)
  })
})

describe('stayVerdict — watch-outs', () => {
  it('warns when a quarter of the mentions went negative', () => {
    const verdict = stayVerdict(
      stay({ reviewTopics: [{ name: 'noise', positive: 60, negative: 30, total: 90 }] }),
    )
    expect(verdict.watchOuts[0]).toMatchObject({ topic: 'Noise', negative: 30 })
    expect(verdict.loved).toEqual([])
  })

  it('never counts one topic as both loved and a watch-out', () => {
    const verdict = stayVerdict(
      stay({ reviewTopics: [{ name: 'noise', positive: 60, negative: 30, total: 90 }] }),
    )
    expect(verdict.loved.map((f) => f.topic)).not.toContain('Noise')
  })
})

describe('stayVerdict — quotes are real and unattributed', () => {
  const topics = [{ name: 'parking', positive: 20, negative: 40, total: 60 }]

  it('quotes a reviewer who actually mentioned the topic', () => {
    const verdict = stayVerdict(
      stay({
        reviewTopics: topics,
        reviewSnippets: [
          { text: 'Lovely breakfast in the courtyard.', rating: 5 },
          { text: 'The only thing missing is a parking lot.', rating: 3 },
        ],
      }),
    )
    expect(verdict.watchOuts[0].quote).toBe('The only thing missing is a parking lot.')
  })

  it('prefers the critical voice for a watch-out', () => {
    const verdict = stayVerdict(
      stay({
        reviewTopics: topics,
        reviewSnippets: [
          { text: 'Parking was easy enough for us.', rating: 5 },
          { text: 'Parking is a nightmare around here.', rating: 2 },
        ],
      }),
    )
    expect(verdict.watchOuts[0].quote).toBe('Parking is a nightmare around here.')
  })

  it('prefers the warm voice for a pro', () => {
    const verdict = stayVerdict(
      stay({
        reviewTopics: [{ name: 'staff', positive: 300, negative: 5, total: 305 }],
        reviewSnippets: [
          { text: 'The staff were fine.', rating: 3 },
          { text: 'The staff treated us like family.', rating: 5 },
        ],
      }),
    )
    expect(verdict.loved[0].quote).toBe('The staff treated us like family.')
  })

  it('leaves the quote out rather than using one about something else', () => {
    const verdict = stayVerdict(
      stay({
        reviewTopics: topics,
        reviewSnippets: [{ text: 'Beautiful tiles in the bathroom.', rating: 5 }],
      }),
    )
    expect(verdict.watchOuts[0].quote).toBeUndefined()
  })

  it('never carries the reviewer name', () => {
    const verdict = stayVerdict(
      stay({
        reviewTopics: topics,
        reviewSnippets: [
          { text: 'Parking is impossible on this street.', rating: 2 },
        ],
      }),
    )
    expect(JSON.stringify(verdict)).not.toContain('Jane')
    expect(verdict.watchOuts[0]).not.toHaveProperty('author')
  })

  it('trims a long quote on a word boundary', () => {
    const long = 'parking ' + 'is a genuine problem here and I will explain at length '.repeat(8)
    const verdict = stayVerdict(
      stay({ reviewTopics: topics, reviewSnippets: [{ text: long, rating: 2 }] }),
    )
    const quote = verdict.watchOuts[0].quote as string
    expect(quote.length).toBeLessThanOrEqual(181)
    expect(quote.endsWith('…')).toBe(true)
    expect(quote).not.toMatch(/\s…$/)
  })

  it('collapses line breaks so a quote reads as one line', () => {
    const verdict = stayVerdict(
      stay({
        reviewTopics: topics,
        reviewSnippets: [{ text: 'Parking\n\n  was hard.', rating: 2 }],
      }),
    )
    expect(verdict.watchOuts[0].quote).toBe('Parking was hard.')
  })
})

describe('stayVerdict — what is not available', () => {
  it('reports absences that change plans', () => {
    const verdict = stayVerdict(
      stay({ excludedAmenities: ['No parking', 'Air conditioning', 'Fax machine', 'Ironing service'] }),
    )
    expect(verdict.missing).toEqual(['No parking', 'Air conditioning'])
  })

  it('deduplicates and caps them', () => {
    const verdict = stayVerdict(
      stay({
        excludedAmenities: ['Pool', 'Pool', 'Gym', 'Elevator', 'Kitchen', 'Breakfast', 'Pets'],
      }),
    )
    expect(verdict.missing).toHaveLength(4)
    expect(new Set(verdict.missing).size).toBe(4)
  })

  it('makes an absence enough on its own to be worth showing', () => {
    expect(hasVerdict(stayVerdict(stay({ excludedAmenities: ['No parking'] })))).toBe(true)
  })
})

describe('findingEvidence', () => {
  it('reads as counts, not a claim', () => {
    expect(findingEvidence({ topic: 'Service', positive: 1240, negative: 18 })).toBe(
      '1,240 positive · 18 negative',
    )
  })

  it('is absent when there is nothing to count', () => {
    expect(findingEvidence({ topic: 'Service' })).toBeUndefined()
  })
})
