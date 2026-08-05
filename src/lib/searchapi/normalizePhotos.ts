interface RawPhoto {
  image?: string
  thumbnail?: string
}

export interface RawPhotosResponse {
  photos?: RawPhoto[]
}

/** Below this, the provider is serving a postage stamp and a card will show it blurred. */
const MIN_USEFUL_WIDTH = 400

/** What we ask for instead. Square, because these are drawn with object-cover. */
const UPGRADE_TO = 800

/**
 * Google photo URLs end in a size hint, and it goes wrong in both directions.
 *
 * `=s0` means "original", which runs to several megabytes — far too heavy for a card or a lightbox,
 * and slow enough to look broken. `=w86-h86` is the other extreme: a Maps search thumbnail, which
 * stays 86 pixels wide however large we draw it, so a card fills with a blurred smear. Both get
 * rewritten to something a card can actually use.
 */
export function capPhotoSize(url: string, width = 1600): string {
  const capped = url.replace(/=s0(?=$|[^0-9])/, `=s${width}`)
  return capped.replace(/=w(\d+)-h(\d+)/, (match, w: string) =>
    Number(w) < MIN_USEFUL_WIDTH ? `=w${UPGRADE_TO}-h${UPGRADE_TO}` : match,
  )
}

export function normalizePhotos(raw: RawPhotosResponse): string[] {
  return (raw.photos ?? [])
    .map((p) => p.image ?? p.thumbnail ?? '')
    .filter(Boolean)
    .map((url) => capPhotoSize(url))
}
