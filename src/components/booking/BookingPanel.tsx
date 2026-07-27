'use client'

import { useMemo, useState } from 'react'
import type { TripState } from '@/lib/trip/types'
import {
  bookableItems,
  bookingProgress,
  bookingTotal,
  BOOKING_LABEL,
  type BookableItem,
  type BookingStatus,
} from '@/lib/trip/booking'
import { formatMoney } from '@/lib/ui/format'
import { formatDateRange } from '@/lib/trip/dates'
import { Heading } from '@/components/ui/Heading'
import { RemoteImage } from '@/components/ui/RemoteImage'

const STATUSES: BookingStatus[] = ['not_booked', 'booked', 'confirmed']

function StatusControl({
  status,
  onChange,
  label,
}: {
  status: BookingStatus
  onChange: (status: BookingStatus) => void
  label: string
}) {
  const dot =
    status === 'confirmed' ? 'text-green-700' : status === 'booked' ? 'text-accent-600' : 'text-muted'
  return (
    <label className="flex items-center justify-center gap-2 rounded-full border border-hairline bg-white/70 px-4 py-2.5">
      <span aria-hidden="true" className={dot}>
        ●
      </span>
      <span className="sr-only">{`Booking status for ${label}`}</span>
      <select
        aria-label={`Booking status for ${label}`}
        value={status}
        onChange={(e) => onChange(e.target.value as BookingStatus)}
        className="bg-transparent text-xs font-bold uppercase tracking-wide text-ink outline-none"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {BOOKING_LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  )
}

function PartnerCard({
  item,
  status,
  onStatus,
}: {
  item: BookableItem
  status: BookingStatus
  onStatus: (status: BookingStatus) => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-hairline bg-sand/40 p-3">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
        <RemoteImage
          src={item.thumbnail}
          alt={item.title}
          fallbackGlyph={item.kind === 'flight' ? '✈' : item.kind === 'stay' ? '🏨' : '🎫'}
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
          fallbackClassName="text-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{item.title}</div>
          {item.detail && (
            <div className="truncate text-[11px] font-medium text-muted">{item.detail}</div>
          )}
        </div>
        {item.price !== undefined && item.price > 0 && (
          <div className="shrink-0 text-base font-bold text-deep">{formatMoney(item.price)}</div>
        )}
      </div>

      {item.bookUrl && (
        <a
          href={item.bookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-deep px-4 py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
        >
          Book on {item.partner} ↗
        </a>
      )}

      <StatusControl status={status} onChange={onStatus} label={item.title} />
    </div>
  )
}

/**
 * What "Continue to book" opens: every bookable part of the trip with the provider that sells it.
 * Triperco is not affiliated with any of them and never books anything — the traveler finishes on
 * the provider's own site and records here what they have done.
 */
export function BookingPanel({ trip, onClose }: { trip: TripState; onClose: () => void }) {
  const items = useMemo(() => bookableItems(trip), [trip])
  // Status lives here: it's the traveler's own record of what they've done off-site.
  const [statuses, setStatuses] = useState<Record<string, BookingStatus>>({})
  const [view, setView] = useState<'partners' | 'summary'>('partners')

  const withStatus = items.map((item) => ({ ...item, status: statuses[item.key] ?? item.status }))
  const progress = bookingProgress(withStatus)
  const total = bookingTotal(withStatus)
  const title = trip.meta.title ?? `${trip.meta.destination ?? 'Your'} trip`
  const range = formatDateRange(trip.meta.startDate, trip.meta.endDate)

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Dismiss booking"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-deep/40 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={view === 'partners' ? 'Where to book each part' : 'Trip summary'}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-hairline bg-canvas shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
            {view === 'summary' && (
              <span aria-hidden="true" className="text-green-700">
                ✓
              </span>
            )}
            {view === 'partners' ? 'My trip' : 'Trip summary'}
          </span>
          <div className="flex items-center gap-2">
            {view === 'summary' && (
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-sand"
              >
                Print / Save PDF
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-2 py-1 text-sm font-bold text-muted transition hover:bg-sand hover:text-ink"
            >
              Close ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <Heading level={2} className="text-3xl">
            {view === 'partners' ? 'Where to book each part' : title}
          </Heading>
          {view === 'summary' && range && (
            <p className="mt-1 text-sm font-medium text-muted">
              {range} · {trip.meta.travelers} traveler{trip.meta.travelers === 1 ? '' : 's'}
            </p>
          )}
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {progress.done} of {progress.total} booked
          </p>

          {items.length === 0 ? (
            <p className="mt-6 text-sm font-medium text-muted">
              Nothing to book yet — add a flight, a stay or something to do first.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {withStatus.map((item) => (
                <PartnerCard
                  key={item.key}
                  item={item}
                  status={item.status}
                  onStatus={(status) => setStatuses((s) => ({ ...s, [item.key]: status }))}
                />
              ))}
            </div>
          )}

          {view === 'partners' && items.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setView('summary')}
                className="mt-5 w-full rounded-2xl border border-hairline bg-white px-4 py-3.5 text-sm font-bold text-ink transition hover:bg-sand"
              >
                View trip summary
              </button>
              <p className="mt-3 text-xs font-medium leading-relaxed text-muted">
                Triperco keeps the itinerary together. Each booking is completed on the provider&apos;s
                own site, and your confirmation comes from them — we are not affiliated with any of
                them, and prices are as of search.
              </p>
            </>
          )}

          {view === 'summary' && (
            <button
              type="button"
              onClick={() => setView('partners')}
              className="mt-5 text-sm font-bold text-accent"
            >
              ← Back to booking links
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-hairline bg-white/50 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Trip total</div>
            <div className="text-xl font-bold text-ink">{formatMoney(total)}</div>
          </div>
          <span className="text-[11px] font-medium text-muted">Prices as of search</span>
        </div>
      </div>
    </div>
  )
}
