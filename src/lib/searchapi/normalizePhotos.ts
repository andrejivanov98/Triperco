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
export function capPhotoSize(url: unknown, width = 1600): string {
  /*
   * Typed loosely on purpose. The provider's photo fields are not one shape: a place's `images` can
   * arrive as urls or as `{ title, thumbnail }` objects, and handing one of those objects to
   * `String.replace` threw — which took the whole normalization down with it and left the plan with
   * no cover photo at all. A value we cannot read is no photo, not an exception.
   */
  if (typeof url !== 'string') return ''
  const capped = url.replace(/=s0(?=$|[^0-9])/, `=s${width}`)
  return capped.replace(/=w(\d+)-h(\d+)/, (match, w: string) =>
    Number(w) < MIN_USEFUL_WIDTH ? `=w${UPGRADE_TO}-h${UPGRADE_TO}` : match,
  )
}

/**
 * A photo url out of whatever the provider put in a photo field.
 *
 * Google Maps results carry photos three ways depending on the query: a bare url string, an object
 * with `image`, or — on a single-place result such as a city — an object that only has `thumbnail`,
 * because those entries are photo *categories* ("All", "Latest") rather than photos.
 */
export function photoUrl(value: unknown): string {
  if (typeof value === 'string') return capPhotoSize(value)
  if (typeof value === 'object' && value !== null) {
    const { image, thumbnail } = value as { image?: unknown; thumbnail?: unknown }
    return capPhotoSize(typeof image === 'string' ? image : thumbnail)
  }
  return ''
}

export function normalizePhotos(raw: RawPhotosResponse): string[] {
  return (raw.photos ?? []).map(photoUrl).filter(Boolean)
}
