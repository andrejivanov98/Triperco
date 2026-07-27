import type { TimelineItem } from '@/lib/trip/timeline'
import { formatMoney } from '@/lib/ui/format'

const KIND_GLYPH: Record<TimelineItem['kind'], string> = {
  flight: '✈',
  stay: '🏨',
  activity: '🎫',
}

/** One row of the plan. Built to stay readable in a narrow side panel. */
export function TimelineItemCard({ item }: { item: TimelineItem }) {
  const booked = item.bookingStatus === 'booked'
  return (
    <div className="rounded-xl border border-hairline bg-white/60 p-2.5">
      <div className="flex items-start gap-2.5">
        {item.thumbnail ? (
          // Data-driven external host (SearchApi photos) — plain img avoids next/image allowlisting.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sand text-base">
            {KIND_GLYPH[item.kind]}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-ink">{item.title}</div>
          {item.subtitle && (
            <div className="truncate text-[11px] font-medium text-muted">{item.subtitle}</div>
          )}
          {(item.timeLabel || item.dateLabel) && (
            <div className="truncate text-[11px] font-medium text-muted">
              {[item.dateLabel, item.timeLabel].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {item.price !== undefined && (
          <div className="shrink-0 text-right text-xs font-bold text-ink">
            {formatMoney(item.price)}
            {item.priceUnit === 'night' && (
              <span className="block text-[10px] font-medium text-muted">/night</span>
            )}
          </div>
        )}
      </div>

      {item.bookUrl && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={
              'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ' +
              (booked ? 'text-accent-600' : 'text-muted')
            }
          >
            ● {booked ? 'Booked' : 'Not booked'}
          </span>
          <a
            href={item.bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-deep px-2.5 py-1 text-[11px] font-bold text-white transition hover:opacity-90"
          >
            {item.bookLabel ?? 'Book'} ↗
          </a>
        </div>
      )}
    </div>
  )
}
