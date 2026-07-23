interface RawPhoto {
  image?: string
  thumbnail?: string
}

export interface RawPhotosResponse {
  photos?: RawPhoto[]
}

export function normalizePhotos(raw: RawPhotosResponse): string[] {
  return (raw.photos ?? [])
    .map((p) => p.image ?? p.thumbnail ?? '')
    .filter(Boolean)
}
