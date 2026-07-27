import type { ReactNode } from 'react'

/** A titled block inside a detail panel. */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  )
}

export interface Fact {
  label: string
  value?: string
  note?: string
}

/** Key/value facts, skipping anything the provider didn't give us. */
export function FactGrid({ facts }: { facts: Fact[] }) {
  const present = facts.filter((f) => Boolean(f.value))
  if (present.length === 0) return null
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {present.map((f) => (
        <div key={f.label} className="rounded-xl border border-hairline bg-white/50 px-3 py-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{f.label}</dt>
          <dd className="text-sm font-semibold text-ink">{f.value}</dd>
          {f.note && <dd className="text-[11px] font-medium text-muted">{f.note}</dd>}
        </div>
      ))}
    </dl>
  )
}

/**
 * A photo mosaic: one lead image with a grid beside it. Every tile opens the full gallery, and the
 * last tile counts what's left when there are more photos than fit.
 */
export function Gallery({
  photos,
  title,
  onOpen,
}: {
  photos: string[]
  title: string
  onOpen?: (index: number) => void
}) {
  if (photos.length === 0) return null

  const lead = photos[0]
  const rest = photos.slice(1, 5)
  const remaining = photos.length - 1 - rest.length

  const tile = (src: string, index: number, className: string, overlay?: string) => (
    <button
      key={index}
      type="button"
      onClick={() => onOpen?.(index)}
      aria-label={`Open ${title} photo ${index + 1}`}
      className={`group relative overflow-hidden rounded-xl bg-sand ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${title} photo ${index + 1}`}
        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
      />
      {overlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-deep/55 text-sm font-bold text-white">
          {overlay}
        </span>
      )}
    </button>
  )

  return (
    <div className={'grid gap-2 ' + (rest.length > 0 ? 'grid-cols-4' : 'grid-cols-1')}>
      {tile(lead, 0, rest.length > 0 ? 'col-span-4 h-60' : 'h-60')}
      {rest.map((src, i) =>
        tile(
          src,
          i + 1,
          'h-20',
          i === rest.length - 1 && remaining > 0 ? `+${remaining}` : undefined,
        ),
      )}
    </div>
  )
}

/** Pills for amenities, service options, tags. */
export function PillList({ items, muted = false }: { items: string[]; muted?: boolean }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={
            'rounded-full border px-2.5 py-1 text-xs font-medium ' +
            (muted
              ? 'border-hairline bg-transparent text-muted line-through'
              : 'border-hairline bg-white/60 text-ink')
          }
        >
          {item}
        </span>
      ))}
    </div>
  )
}

/** Horizontal bar for a rating histogram or a review topic. */
export function MeterRow({
  label,
  value,
  max,
  caption,
}: {
  label: string
  value: number
  max: number
  caption?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-ink">
      <span className="w-24 shrink-0 truncate">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-16 shrink-0 text-right text-muted">{caption ?? value.toLocaleString('en-US')}</span>
    </div>
  )
}

export function ReviewList({
  reviews,
  title,
}: {
  reviews: { author?: string; rating?: number; text: string; date?: string }[]
  title: string
}) {
  if (reviews.length === 0) return null
  return (
    <DetailSection title={title}>
      <div className="flex flex-col gap-2">
        {reviews.slice(0, 6).map((r, i) => (
          <blockquote key={i} className="rounded-xl border border-hairline bg-white/50 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted">
              {r.author && <span className="text-ink">{r.author}</span>}
              {r.rating !== undefined && <span>{r.rating} ★</span>}
              {r.date && <span>{r.date}</span>}
            </div>
            <p className="mt-1 text-sm font-medium leading-relaxed text-ink">{r.text}</p>
          </blockquote>
        ))}
      </div>
    </DetailSection>
  )
}
