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

/**
 * A Maps search thumbnail is an 86px crop. Drawn across a card it fills with a blurred smear, which
 * is what "the cover images on things to do are awful" actually was.
 */
describe('capPhotoSize — upgrading a thumbnail', () => {
  it('asks for a usable width when the provider served a postage stamp', () => {
    expect(capPhotoSize('https://lh5.googleusercontent.com/p/AF1Q=w86-h86-k-no')).toBe(
      'https://lh5.googleusercontent.com/p/AF1Q=w800-h800-k-no',
    )
  })

  it('leaves a photo that is already big enough alone', () => {
    const url = 'https://lh5.googleusercontent.com/p/AF1Q=w1200-h800-k-no'
    expect(capPhotoSize(url)).toBe(url)
  })

  it('still caps an original-size url', () => {
    expect(capPhotoSize('https://lh5.googleusercontent.com/p/AF1Q=s0')).toBe(
      'https://lh5.googleusercontent.com/p/AF1Q=s1600',
    )
  })

  it('leaves a url with no size hint untouched', () => {
    const url = 'https://example.com/photo.jpg'
    expect(capPhotoSize(url)).toBe(url)
  })
})
