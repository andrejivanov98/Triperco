import { describe, it, expect } from 'vitest'
import { normalizePhotos, type RawPhotosResponse } from './normalizePhotos'

const raw: RawPhotosResponse = {
  photos: [
    { image: 'https://full/1', thumbnail: 'https://thumb/1' },
    { thumbnail: 'https://thumb/2' }, // no full image
  ],
}

describe('normalizePhotos', () => {
  it('prefers full image, falls back to thumbnail', () => {
    expect(normalizePhotos(raw)).toEqual(['https://full/1', 'https://thumb/2'])
  })

  it('returns [] with no photos', () => {
    expect(normalizePhotos({})).toEqual([])
  })
})
