'use client'

import { useState } from 'react'
import type { TimelineItem } from '@/lib/trip/timeline'
import { formatMoney, formatRating } from '@/lib/ui/format'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { Icon, type IconName } from '@/components/ui/Icon'

const KIND_ICON: Record<TimelineItem['kind'], IconName> = {
  flight: 'plane',
  stay: 'bed',
  activity: 'ticket',
}

/**
 * One row of the plan. Collapsed it stays readable in a narrow panel; expanded it offers the
 * actions that belong to that item — remove it, open it, or go book it.
 */
export function TimelineItemCard({
  item,
  onRemove,
  onViewDetails,
}: {
  item: TimelineItem
  onRemove?: (item: TimelineItem) => void
  onViewDetails?: (item: TimelineItem) => void
}) {
  const [open, setOpen] = useState(false)
  const booked = item.bookingStatus === 'booked'
  const canAct = Boolean(onRemove || onViewDetails || item.bookUrl)

  return (
    <div
      className={
        'rounded-xl border bg-white/70 transition ' +
        (open ? 'border-deep/30 shadow-sm' : 'border-hairline')
      }
    >
      <button
        type="button"
        onClick={() => (canAct ? setOpen((v) => !v) : undefined)}
        aria-expanded={canAct ? open : undefined}
        aria-label={canAct ? `${open ? 'Hide' : 'Show'} options for ${item.title}` : undefined}
        className="flex w-full items-start gap-2.5 p-2.5 text-left"
      >
        {/*
          A logo is contained on white, a photo is cropped to fill. Drawing an airline mark with
          object-cover turned it into a slice of coloured square with no logo visible in it.
        */}
        {item.logo ? (
          <RemoteImage
            src={item.logo}
            alt={item.subtitle?.split(' · ')[0] ?? item.title}
            fallbackGlyph={<Icon name={KIND_ICON[item.kind]} className="h-4 w-4" />}
            className="h-11 w-11 shrink-0 rounded-lg border border-hairline bg-white object-contain p-1.5"
            fallbackClassName="text-base"
          />
        ) : (
          <RemoteImage
            src={item.thumbnail}
            alt={item.title}
            fallbackGlyph={<Icon name={KIND_ICON[item.kind]} className="h-4 w-4" />}
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
            fallbackClassName="text-base"
          />
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

        <div className="flex shrink-0 flex-col items-end">
          {item.price !== undefined && (
            <span className="text-xs font-bold text-ink">
              {formatMoney(item.price)}
              {item.priceUnit === 'night' && (
                <span className="block text-[10px] font-medium text-muted">/night</span>
              )}
            </span>
          )}
          {canAct && (
            <span aria-hidden="true" className="mt-0.5 text-[11px] font-bold text-muted">
              {open ? '⌃' : '⌄'}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-hairline px-2.5 py-2.5">
          {formatRating(item.rating, item.reviewCount) && (
            <div className="text-[11px] font-semibold text-ink">
              ★ {formatRating(item.rating, item.reviewCount)}
            </div>
          )}
          {item.description && (
            <p className="text-[11px] font-medium leading-relaxed text-muted">{item.description}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <span
              className={
                'text-[10px] font-bold uppercase tracking-wide ' +
                (booked ? 'text-accent-600' : 'text-muted')
              }
            >
              ● {booked ? 'Booked' : 'Not booked'}
            </span>
            {item.bookUrl && (
              <a
                href={item.bookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-deep px-2.5 py-1 text-[11px] font-bold text-white transition active:scale-[0.97] hover:opacity-90"
              >
                {item.bookLabel ?? 'Book'}
                <Icon name="arrow-up-right" className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="flex gap-2">
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="flex-1 rounded-xl border border-hairline bg-white px-3 py-2 text-[11px] font-bold text-ink transition active:scale-[0.97] hover:border-red-300 hover:text-red-600"
              >
                Remove
              </button>
            )}
            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(item)}
                className="flex-1 rounded-xl bg-deep px-3 py-2 text-[11px] font-bold text-white transition active:scale-[0.97] hover:opacity-90"
              >
                View details
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
