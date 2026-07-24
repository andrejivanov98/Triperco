import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { formatMoney } from '@/lib/ui/format'

type Item = Flight | Stay | Place

function metaLine(
  kind: ResultSet['kind'],
  item: Item,
): { title: string; sub?: string; photo?: string; price?: string } {
  if (kind === 'stays') {
    const s = item as Stay
    const rating = [
      s.rating !== undefined ? `${s.rating} ★` : null,
      s.reviewCount !== undefined ? `${s.reviewCount.toLocaleString()} reviews` : null,
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      title: s.name,
      sub: rating || (s.source === 'airbnb' ? 'Home' : 'Hotel'),
      photo: s.photos[0],
      price: `${formatMoney(s.pricePerNight)}/night`,
    }
  }
  if (kind === 'flights') {
    const f = item as Flight
    const stops = f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`
    return {
      title: `${f.from} → ${f.to}`,
      sub: [f.airline, stops, f.departTime && f.arriveTime ? `${f.departTime}–${f.arriveTime}` : null]
        .filter(Boolean)
        .join(' · '),
      price: formatMoney(f.price),
    }
  }
  const p = item as Place
  const rating = [
    p.rating !== undefined ? `${p.rating} ★` : null,
    p.reviewCount !== undefined ? `${p.reviewCount.toLocaleString()} reviews` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return { title: p.name, sub: [p.category, rating].filter(Boolean).join(' · ') || undefined, photo: p.photos[0] }
}

export function ResultCard({
  kind,
  item,
  onOpen,
  onAdd,
}: {
  kind: ResultSet['kind']
  item: Item
  onOpen: () => void
  onAdd: () => void
}) {
  const { title, sub, photo, price } = metaLine(kind, item)
  return (
    <div className="glass flex w-56 shrink-0 flex-col overflow-hidden p-0">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View details for ${title}`}
        className="block text-left"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-32 w-full object-cover" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-sand text-2xl">
            {kind === 'flights' ? '✈' : '📍'}
          </div>
        )}
        <div className="p-3">
          <div className="truncate text-sm font-semibold text-ink">{title}</div>
          {sub && <div className="mt-0.5 line-clamp-1 text-xs font-medium text-muted">{sub}</div>}
        </div>
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 px-3 pb-3">
        {price ? <span className="text-sm font-bold text-ink">{price}</span> : <span />}
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-accent/25"
        >
          Add to trip
        </button>
      </div>
    </div>
  )
}
