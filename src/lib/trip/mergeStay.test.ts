import { describe, it, expect } from 'vitest'
import { mergeStayDetail } from './mergeStay'
import type { Stay } from './types'

const base: Stay = {
  id: 's1',
  name: 'Palazzo',
  source: 'hotel',
  pricePerNight: 180,
  nights: 4,
  photos: ['https://search/1'],
  bookUrl: 'https://search/book',
  amenities: ['Free Wi-Fi', 'Pool'],
  essentialInfo: ['Sleeps 4'],
  propertyToken: 'tok',
}

describe('mergeStayDetail', () => {
  it('takes the richer detail fields', () => {
    const merged = mergeStayDetail(base, {
      address: 'Via Roma 1',
      phone: '+39 06 1',
      ratingsBreakdown: [{ stars: 5, count: 300 }],
    } as Partial<Stay>)
    expect(merged.address).toBe('Via Roma 1')
    expect(merged.phone).toBe('+39 06 1')
    expect(merged.ratingsBreakdown).toEqual([{ stars: 5, count: 300 }])
  })

  it('keeps fields the detail response does not carry', () => {
    // The property endpoint returns no amenities — they must survive the merge.
    const merged = mergeStayDetail(base, {
      address: 'Via Roma 1',
      amenities: undefined,
      essentialInfo: undefined,
    } as Partial<Stay>)
    expect(merged.amenities).toEqual(['Free Wi-Fi', 'Pool'])
    expect(merged.essentialInfo).toEqual(['Sleeps 4'])
  })

  it('never lets the detail replace the identity or the booked nights', () => {
    const merged = mergeStayDetail(base, { id: 'other', nights: 99, name: 'Renamed' } as Partial<Stay>)
    expect(merged.id).toBe('s1')
    expect(merged.nights).toBe(4)
    expect(merged.name).toBe('Renamed')
  })

  it('ignores empty arrays from the detail response', () => {
    const merged = mergeStayDetail(base, { photos: [] } as Partial<Stay>)
    expect(merged.photos).toEqual(['https://search/1'])
  })

  it('returns the base unchanged when there is no detail', () => {
    expect(mergeStayDetail(base, null)).toEqual(base)
  })
})
