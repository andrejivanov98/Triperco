import type { Stay } from '@/lib/trip/types'
import { formatMoney } from '@/lib/ui/format'

export function StayCard({ stay }: { stay: Stay }) {
  const meta = [
    stay.rating !== undefined ? `${stay.rating} ★` : null,
    stay.reviewCount !== undefined ? `${stay.reviewCount.toLocaleString()} reviews` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="glass flex items-center gap-3 p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-accent">Stay</div>
        <div className="truncate text-sm font-semibold text-ink">{stay.name}</div>
        {meta && <div className="truncate text-xs font-medium text-muted">{meta}</div>}
      </div>
      <a
        href={stay.bookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto shrink-0 text-right text-sm font-bold text-accent"
      >
        {formatMoney(stay.pricePerNight)}
        <span className="block text-[10px] font-medium text-muted">/night ↗</span>
      </a>
    </div>
  )
}
