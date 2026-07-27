import { describe, it, expect } from 'vitest'
import { normalizePhotos, capPhotoSize, type RawPhotosResponse } from './normalizePhotos'

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

  it('caps original-size Google photos to a loadable width', () => {
    expect(
      normalizePhotos({ photos: [{ image: 'https://lh3.googleusercontent.com/gps-cs/AAA=s0' }] }),
    ).toEqual(['https://lh3.googleusercontent.com/gps-cs/AAA=s1600'])
  })

  it('leaves an already-sized url alone', () => {
    expect(capPhotoSize('https://lh3.googleusercontent.com/x=s287-w287-h192')).toBe(
      'https://lh3.googleusercontent.com/x=s287-w287-h192',
    )
    expect(capPhotoSize('https://static.example.com/photo.jpg')).toBe(
      'https://static.example.com/photo.jpg',
    )
  })
})
