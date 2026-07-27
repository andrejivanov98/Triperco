interface RawPhoto {
  image?: string
  thumbnail?: string
}

export interface RawPhotosResponse {
  photos?: RawPhoto[]
}

/**
 * Google photo URLs end in a size hint. `=s0` means "original", which runs to several megabytes —
 * far too heavy for a card or a lightbox, and slow enough to look broken. Ask for a sane width.
 */
export function capPhotoSize(url: string, width = 1600): string {
  return url.replace(/=s0(?=$|[^0-9])/, `=s${width}`)
}

export function normalizePhotos(raw: RawPhotosResponse): string[] {
  return (raw.photos ?? [])
    .map((p) => p.image ?? p.thumbnail ?? '')
    .filter(Boolean)
    .map((url) => capPhotoSize(url))
}
