import type { Stay } from '@/lib/trip/types'
import { formatMoney, formatRating } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import {
  DetailSection,
  FactGrid,
  Gallery,
  MeterRow,
  PillList,
  ReviewList,
} from './DetailPrimitives'

export function StayDetail({ stay, loading }: { stay: Stay; loading?: boolean }) {
  const total = stay.totalPrice ?? stay.pricePerNight * stay.nights
  const ratingBuckets = stay.ratingsBreakdown ?? []
  const maxBucket = Math.max(1, ...ratingBuckets.map((b) => b.count))
  const topics = stay.reviewTopics ?? []

  return (
    <div className="flex flex-col gap-5">
      <Gallery photos={stay.photos} title={stay.name} />

      <div>
        <Heading level={2} className="text-2xl">
          {stay.name}
        </Heading>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-muted">
          {stay.hotelClass && <span>{stay.hotelClass}</span>}
          {stay.kind === 'vacation_rental' && <span>Entire place</span>}
          {formatRating(stay.rating, stay.reviewCount) && (
            <span className="text-ink">{formatRating(stay.rating, stay.reviewCount)}</span>
          )}
          {stay.ecoCertified && <span className="text-accent-600">Eco-certified</span>}
        </div>
        {stay.address && <div className="mt-1 text-sm font-medium text-muted">{stay.address}</div>}
      </div>

      {stay.dealBadge && (
        <div className="rounded-xl bg-accent-050 px-3 py-2 text-sm font-semibold text-accent-600">
          {stay.dealBadge}
        </div>
      )}

      <FactGrid
        facts={[
          { label: 'Per night', value: stay.pricePerNight ? formatMoney(stay.pricePerNight) : undefined },
          {
            label: 'Total',
            value: total ? formatMoney(total) : undefined,
            note: `${stay.nights} night${stay.nights === 1 ? '' : 's'}`,
          },
          { label: 'Check-in', value: stay.checkInTime },
          { label: 'Check-out', value: stay.checkOutTime },
        ]}
      />

      {stay.description && (
        <DetailSection title="About this place">
          <p className="text-sm font-medium leading-relaxed text-ink">{stay.description}</p>
        </DetailSection>
      )}

      {loading && (
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Loading full details…
          </span>
          <div className="h-3 w-2/3 animate-pulse rounded bg-sand" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-sand" />
        </div>
      )}

      {stay.amenities && stay.amenities.length > 0 && (
        <DetailSection title="What's here">
          <PillList items={stay.amenities.slice(0, 24)} />
          {stay.excludedAmenities && stay.excludedAmenities.length > 0 && (
            <div className="mt-1">
              <PillList items={stay.excludedAmenities.slice(0, 8)} muted />
            </div>
          )}
        </DetailSection>
      )}

      {ratingBuckets.length > 0 && (
        <DetailSection title="How guests rate it">
          <div className="flex flex-col gap-1.5">
            {[...ratingBuckets]
              .sort((a, b) => b.stars - a.stars)
              .map((b) => (
                <MeterRow key={b.stars} label={`${b.stars} stars`} value={b.count} max={maxBucket} />
              ))}
          </div>
        </DetailSection>
      )}

      {topics.length > 0 && (
        <DetailSection title="What reviewers talk about">
          <div className="flex flex-col gap-1.5">
            {topics.slice(0, 8).map((t) => {
              const positive = t.positive ?? 0
              const mentions = t.total ?? positive + (t.negative ?? 0) + (t.neutral ?? 0)
              return (
                <MeterRow
                  key={t.name}
                  label={t.name}
                  value={positive}
                  max={Math.max(1, mentions)}
                  caption={mentions ? `${Math.round((positive / mentions) * 100)}% good` : undefined}
                />
              )
            })}
          </div>
        </DetailSection>
      )}

      <ReviewList reviews={stay.reviewSnippets ?? []} title="What guests say" />

      {stay.nearbyPlaces && stay.nearbyPlaces.length > 0 && (
        <DetailSection title="Getting around">
          <ul className="flex flex-col gap-1 text-sm font-medium text-ink">
            {stay.nearbyPlaces.slice(0, 8).map((n) => (
              <li key={n.name} className="flex justify-between gap-3">
                <span className="truncate">{n.name}</span>
                {n.transit && <span className="shrink-0 text-muted">{n.transit}</span>}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {stay.essentialInfo && stay.essentialInfo.length > 0 && (
        <DetailSection title="Good to know">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm font-medium text-ink">
            {stay.essentialInfo.map((info) => (
              <li key={info}>{info}</li>
            ))}
          </ul>
        </DetailSection>
      )}
    </div>
  )
}
