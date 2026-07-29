import { describe, it, expect } from 'vitest'
import { LEGAL_DOCUMENTS, legalDocument } from './documents'

describe('legal documents', () => {
  it('covers every route the footer links to', () => {
    expect(LEGAL_DOCUMENTS.map((d) => d.slug).sort()).toEqual([
      'privacy',
      'terms',
      'website-terms',
    ])
  })

  it('has no empty page', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.title.length).toBeGreaterThan(0)
      expect(doc.summary.length).toBeGreaterThan(0)
      expect(doc.sections.length).toBeGreaterThan(2)
      for (const section of doc.sections) {
        expect(section.heading.length).toBeGreaterThan(0)
        expect(section.body.every((p) => p.trim().length > 30)).toBe(true)
      }
    }
  })

  it('says plainly that we neither book nor take payment', () => {
    const terms = legalDocument('terms')!
    const text = terms.sections.flatMap((s) => s.body).join(' ').toLowerCase()
    expect(text).toContain('not a booking platform')
    expect(text).toContain('does not sell travel, take payment')
    expect(text).toContain('your booking contract is with that provider')
  })

  it('warns that the assistant can be wrong', () => {
    const text = legalDocument('terms')!.sections.flatMap((s) => s.body).join(' ').toLowerCase()
    expect(text).toContain('models make mistakes')
  })

  it('tells people not to put payment details or passports in the chat', () => {
    const text = legalDocument('privacy')!.sections.flatMap((s) => s.body).join(' ').toLowerCase()
    expect(text).toContain('passport numbers, payment card details')
  })

  it('is clear that a shared trip carries the plan and not the conversation', () => {
    const text = legalDocument('privacy')!.sections.flatMap((s) => s.body).join(' ').toLowerCase()
    expect(text).toContain('only the plan is shared — never your conversation')
  })

  it('returns nothing for a slug that does not exist', () => {
    expect(legalDocument('cookies')).toBeUndefined()
  })
})
