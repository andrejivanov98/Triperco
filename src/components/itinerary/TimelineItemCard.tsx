import type { TimelineItem } from '@/lib/trip/timeline'
import { formatMoney } from '@/lib/ui/format'

const KIND_GLYPH: Record<TimelineItem['kind'], string> = {
  flight: '✈',
  stay: '🏠',
  activity: '🎫',
}

export function TimelineItemCard({ item }: { item: TimelineItem }) {
  const booked = item.bookingStatus === 'booked'
  return (
    <div className="glass flex flex-col gap-2 p-3">
      <div className="flex items-center gap-3">
        {item.thumbnail ? (
          // Data-driven external host (SearchApi photos) — plain img avoids next/image allowlisting.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sand text-lg">
            {KIND_GLYPH[item.kind]}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
          {item.subtitle && (
            <div className="truncate text-xs font-medium text-muted">{item.subtitle}</div>
          )}
          {(item.timeLabel || item.dateLabel) && (
            <div className="truncate text-xs font-medium text-muted">
              {[item.dateLabel, item.timeLabel].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {item.price !== undefined && (
          <div className="shrink-0 text-right text-sm font-bold text-ink">
            {formatMoney(item.price)}
            {item.priceUnit === 'night' && (
              <span className="block text-[10px] font-medium text-muted">/night</span>
            )}
          </div>
        )}
      </div>

      {item.bookUrl && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={
              'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ' +
              (booked ? 'text-accent-600' : 'text-muted')
            }
          >
            ● {booked ? 'Booked' : 'Not booked'}
          </span>
          <a
            href={item.bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-deep px-3 py-1.5 text-xs font-bold text-white"
          >
            {item.bookLabel ?? 'Book'} ↗
          </a>
        </div>
      )}
    </div>
  )
}
