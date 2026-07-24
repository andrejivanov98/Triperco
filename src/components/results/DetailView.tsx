import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { formatMoney } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'

type Item = Flight | Stay | Place

interface DetailShape {
  title: string
  ratingLine?: string
  photos: string[]
  facts: string[]
  reviews: { author?: string; text: string }[]
  priceLabel?: string
  bookUrl?: string
  bookLabel: string
}

function toDetail(kind: ResultSet['kind'], item: Item): DetailShape {
  if (kind === 'stays') {
    const s = item as Stay
    return {
      title: s.name,
      ratingLine:
        s.rating !== undefined ? `${s.rating} ★ · ${(s.reviewCount ?? 0).toLocaleString()} reviews` : undefined,
      photos: s.photos,
      facts: [s.source === 'airbnb' ? 'Entire home' : 'Hotel', `${s.nights} nights`].filter(Boolean),
      reviews: [],
      priceLabel: `${formatMoney(s.pricePerNight * s.nights)} total`,
      bookUrl: s.bookUrl,
      bookLabel: s.source === 'airbnb' ? 'Book on Airbnb' : 'Book stay',
    }
  }
  if (kind === 'flights') {
    const f = item as Flight
    const stops = f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`
    return {
      title: `${f.from} → ${f.to}`,
      ratingLine: f.airline,
      photos: [],
      facts: [
        f.departTime && f.arriveTime ? `${f.departTime} – ${f.arriveTime}` : undefined,
        stops,
        f.durationMinutes ? `${Math.floor(f.durationMinutes / 60)}h ${f.durationMinutes % 60}m` : undefined,
      ].filter((x): x is string => Boolean(x)),
      reviews: [],
      priceLabel: formatMoney(f.price),
      bookUrl: f.bookUrl,
      bookLabel: f.airline ? `Book on ${f.airline}` : 'Book flight',
    }
  }
  const p = item as Place
  return {
    title: p.name,
    ratingLine:
      p.rating !== undefined ? `${p.rating} ★ · ${(p.reviewCount ?? 0).toLocaleString()} reviews` : undefined,
    photos: p.photos,
    facts: [p.category, p.address, p.hours].filter((x): x is string => Boolean(x)),
    reviews: p.reviewSnippets ?? [],
    priceLabel: undefined,
    bookUrl: p.sourceLinks?.maps,
    bookLabel: 'Open in Maps',
  }
}

export function DetailView({
  kind,
  item,
  onClose,
  onAdd,
}: {
  kind: ResultSet['kind']
  item: Item
  onClose: () => void
  onAdd: () => void
}) {
  const d = toDetail(kind, item)
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-sm font-semibold text-accent">
          ← Back
        </button>
        {d.priceLabel && <span className="text-sm font-bold text-ink">{d.priceLabel}</span>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {d.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {d.photos.slice(0, 6).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${d.title} photo ${i + 1}`}
                className={'w-full rounded-xl object-cover ' + (i === 0 ? 'col-span-2 h-40' : 'h-24')}
              />
            ))}
          </div>
        )}

        <div>
          <Heading level={2} className="text-xl">
            {d.title}
          </Heading>
          {d.ratingLine && <div className="mt-0.5 text-sm font-medium text-muted">{d.ratingLine}</div>}
        </div>

        {d.facts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {d.facts.map((f) => (
              <span
                key={f}
                className="rounded-full border border-hairline bg-white/60 px-3 py-1 text-xs font-medium text-ink"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {d.reviews.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold text-ink">What guests say</div>
            {d.reviews.slice(0, 4).map((r, i) => (
              <div key={i} className="glass p-3 text-xs font-medium text-ink">
                {r.author && <span className="font-bold">{r.author}: </span>}
                {r.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/25"
        >
          Add to trip
        </button>
        {d.bookUrl && (
          <a
            href={d.bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-deep px-4 py-2.5 text-sm font-bold text-white"
          >
            {d.bookLabel} ↗
          </a>
        )}
      </div>
    </div>
  )
}
