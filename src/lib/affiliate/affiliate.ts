export type Provider = 'booking' | 'airbnb' | 'flight' | 'generic'

export interface AffiliateConfig {
  bookingAid?: string
  travelpayoutsMarker?: string
}

/**
 * Wraps an outbound provider URL with affiliate params where a program exists.
 * Booking.com and Travelpayouts (flights) pay commissions; Airbnb's program is
 * closed, so its links pass through unchanged.
 */
export function buildOutboundUrl(
  provider: Provider,
  targetUrl: string,
  config: AffiliateConfig = {},
): string {
  const url = new URL(targetUrl)
  if (provider === 'booking' && config.bookingAid) {
    url.searchParams.set('aid', config.bookingAid)
  } else if (provider === 'flight' && config.travelpayoutsMarker) {
    url.searchParams.set('marker', config.travelpayoutsMarker)
  }
  return url.toString()
}
