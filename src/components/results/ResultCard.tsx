import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { formatMoney, formatDuration, formatStops, formatRating } from '@/lib/ui/format'
import { Badge, badgeTone } from '@/components/ui/Badge'

type Item = Flight | Stay | Place

interface CardShape {
  title: string
  /** The one line that matters most under the title. */
  sub?: string
  /** Extra scannable facts, one per line. */
  facts: string[]
  photo?: string
  glyph: string
  price?: string
  priceNote?: string
}

function toCard(kind: ResultSet['kind'], item: Item): CardShape {
  if (kind === 'stays') {
    const s = item as Stay
    const total = s.totalPrice ?? s.pricePerNight * s.nights
    return {
      title: s.name,
      sub: formatRating(s.rating, s.reviewCount),
      facts: [
        s.hotelClass ?? (s.kind === 'vacation_rental' ? 'Entire place' : 'Hotel'),
        s.amenities?.length ? s.amenities.slice(0, 2).join(' · ') : undefined,
      ].filter((f): f is string => Boolean(f)),
      photo: s.photos[0],
      glyph: '🏨',
      price: s.pricePerNight ? formatMoney(s.pricePerNight) : undefined,
      priceNote: total ? `${formatMoney(total)} total` : undefined,
    }
  }

  if (kind === 'flights') {
    const f = item as Flight
    const times = f.departTime && f.arriveTime ? `${f.departTime} – ${f.arriveTime}` : f.departTime
    return {
      title: `${f.from} → ${f.to}`,
      sub: f.airline,
      facts: [
        [times, formatDuration(f.durationMinutes)].filter(Boolean).join(' · ') || undefined,
        formatStops(f.stops, f.layovers?.map((l) => l.code)),
      ].filter((x): x is string => Boolean(x)),
      glyph: '✈',
      price: formatMoney(f.price),
      priceNote: 'per traveler',
    }
  }

  const p = item as Place
  return {
    title: p.name,
    sub: formatRating(p.rating, p.reviewCount),
    facts: [
      [p.category, p.priceRange].filter(Boolean).join(' · ') || undefined,
      p.openNow === true ? 'Open now' : p.openNow === false ? 'Closed now' : undefined,
    ].filter((x): x is string => Boolean(x)),
    photo: p.photos[0],
    glyph: '📍',
  }
}

export function ResultCard({
  kind,
  item,
  badges = [],
  onOpen,
  onAdd,
}: {
  kind: ResultSet['kind']
  item: Item
  badges?: string[]
  onOpen: () => void
  onAdd: () => void
}) {
  const card = toCard(kind, item)
  const featured = badges.includes('Best value')

  return (
    <div
      className={
        'glass flex w-60 shrink-0 flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lg ' +
        (featured ? 'ring-2 ring-accent/40' : '')
      }
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View details for ${card.title}`}
        className="block flex-1 text-left"
      >
        <div className="relative">
          {card.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.photo} alt="" className="h-32 w-full object-cover" />
          ) : (
            <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-accent-050 to-sand text-3xl">
              {card.glyph}
            </div>
          )}
          {badges.length > 0 && (
            <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
              {badges.slice(0, 2).map((b) => (
                <Badge key={b} label={b} tone={badgeTone(b)} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 p-3">
          <div className="truncate text-sm font-semibold text-ink">{card.title}</div>
          {card.sub && <div className="truncate text-xs font-medium text-muted">{card.sub}</div>}
          {card.facts.map((f) => (
            <div key={f} className="truncate text-xs font-medium text-muted">
              {f}
            </div>
          ))}
        </div>
      </button>

      <div className="flex items-end justify-between gap-2 px-3 pb-3">
        <div className="min-w-0">
          {card.price && <div className="text-sm font-bold text-ink">{card.price}</div>}
          {card.priceNote && (
            <div className="truncate text-[10px] font-medium text-muted">{card.priceNote}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-accent/25 transition hover:bg-accent-600"
        >
          Add to trip
        </button>
      </div>
    </div>
  )
}
