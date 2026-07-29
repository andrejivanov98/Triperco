export function formatMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** 315 → "5h 15m"; 45 → "45m". */
export function formatDuration(minutes?: number): string | undefined {
  if (minutes === undefined || minutes < 0) return undefined
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** "Nonstop", "1 stop · MUC", "2 stops · MUC, VIE". */
export function formatStops(stops: number, via?: (string | undefined)[]): string {
  if (stops === 0) return 'Nonstop'
  const codes = (via ?? []).filter((c): c is string => Boolean(c))
  const label = `${stops} stop${stops > 1 ? 's' : ''}`
  return codes.length ? `${label} · ${codes.join(', ')}` : label
}

/** "4.6 ★ · 1,204 reviews", or just the rating when the count is unknown. */
export function formatRating(rating?: number, reviewCount?: number): string | undefined {
  if (rating === undefined) return undefined
  const stars = `${rating} ★`
  return reviewCount === undefined
    ? stars
    : `${stars} · ${reviewCount.toLocaleString('en-US')} reviews`
}

/** 184000 g → "184 kg CO₂e". */
export function formatCarbon(grams?: number): string | undefined {
  if (grams === undefined) return undefined
  return `${Math.round(grams / 1000).toLocaleString('en-US')} kg CO₂e`
}
