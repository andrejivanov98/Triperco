import type { Stay } from '@/lib/trip/types'
import type { StayFinding } from '@/lib/trip/stayVerdict'
import { stayVerdict, hasVerdict, findingEvidence } from '@/lib/trip/stayVerdict'
import { formatMoney, formatRating } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { RemoteImage } from '@/components/ui/RemoteImage'
import {
  DetailSection,
  FactGrid,
  Gallery,
  MeterRow,
  PillList,
  ReviewList,
} from './DetailPrimitives'

/**
 * A finding reviewers agree on. The heading and counts come from the provider's own breakdown and
 * the line beneath is a reviewer's words — so we characterise nothing ourselves.
 */
function FindingList({ findings, tone }: { findings: StayFinding[]; tone: 'good' | 'bad' }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {findings.map((finding, i) => {
        const evidence = findingEvidence(finding)
        return (
          <li key={`${finding.topic}-${i}`} className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span
                className={
                  'text-sm font-bold ' + (tone === 'bad' ? 'text-red-700' : 'text-accent-600')
                }
              >
                {finding.topic}
              </span>
              {evidence && <span className="text-[11px] font-medium text-muted">{evidence}</span>}
            </span>
            {finding.quote && (
              <span className="text-xs font-medium italic leading-relaxed text-muted">
                “{finding.quote}”
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function StayDetail({
  stay,
  loading,
  onOpenPhotos,
}: {
  stay: Stay
  loading?: boolean
  onOpenPhotos?: (index: number) => void
}) {
  const total = stay.totalPrice ?? stay.pricePerNight * stay.nights
  const ratingBuckets = stay.ratingsBreakdown ?? []
  const maxBucket = Math.max(1, ...ratingBuckets.map((b) => b.count))
  const topics = stay.reviewTopics ?? []
  // Grounded pros and cons: the differentiator is telling them what is wrong with the place.
  const verdict = stayVerdict(stay)

  return (
    <div className="flex flex-col gap-5">
      <Gallery photos={stay.photos} title={stay.name} onOpen={onOpenPhotos} />

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
          {
            label: 'Per night',
            value: stay.pricePerNight ? formatMoney(stay.pricePerNight) : undefined,
            note: stay.priceInsight?.level ? `${stay.priceInsight.level} for this place` : undefined,
          },
          {
            label: 'Total',
            value: total ? formatMoney(total) : undefined,
            note: `${stay.nights} night${stay.nights === 1 ? '' : 's'}`,
          },
          { label: 'Check-in', value: stay.checkInTime },
          { label: 'Check-out', value: stay.checkOutTime },
          {
            label: 'Usual price',
            value:
              stay.priceInsight?.typicalLow && stay.priceInsight?.typicalHigh
                ? `${stay.priceInsight.typicalLow}–${stay.priceInsight.typicalHigh}`
                : undefined,
          },
          { label: 'Phone', value: stay.phone },
        ]}
      />

      {stay.offers && stay.offers.length > 0 && (
        <DetailSection title="Where you can book it">
          <div className="flex flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-white/50">
            {stay.offers.slice(0, 6).map((offer, i) => (
              <div key={`${offer.source}-${i}`} className="flex items-center gap-3 px-3 py-2">
                <RemoteImage
                  src={offer.logo}
                  alt={offer.source}
                  fallbackGlyph="🏷"
                  className="h-5 w-5 rounded object-contain"
                  fallbackClassName="text-[10px]"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {offer.source}
                  {offer.official && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-accent-600">
                      Official
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right text-sm font-bold text-ink">
                  {offer.pricePerNight !== undefined && (
                    <>
                      {formatMoney(offer.pricePerNight)}
                      <span className="text-[10px] font-medium text-muted">/night</span>
                    </>
                  )}
                </span>
                {offer.url && (
                  <a
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-deep px-2.5 py-1 text-[11px] font-bold text-white"
                  >
                    Book ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {(stay.locationRating !== undefined ||
        stay.transitRating !== undefined ||
        stay.thingsToDoRating !== undefined ||
        stay.airportRating !== undefined) && (
        <DetailSection title="How the location scores">
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Location', value: stay.locationRating },
              { label: 'Things to do', value: stay.thingsToDoRating },
              { label: 'Transit', value: stay.transitRating },
              { label: 'Airport access', value: stay.airportRating },
            ]
              .filter((r): r is { label: string; value: number } => r.value !== undefined)
              .map((r) => (
                <MeterRow
                  key={r.label}
                  label={r.label}
                  value={r.value}
                  max={5}
                  caption={`${r.value} / 5`}
                />
              ))}
          </div>
        </DetailSection>
      )}

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

      {hasVerdict(verdict) && (
        <div data-testid="stay-verdict" className="flex flex-col gap-5">
          {verdict.loved.length > 0 && (
            <DetailSection title="What guests love">
              <FindingList findings={verdict.loved} tone="good" />
            </DetailSection>
          )}
          {verdict.watchOuts.length > 0 && (
            <DetailSection title="Cons and watch-outs">
              <FindingList findings={verdict.watchOuts} tone="bad" />
            </DetailSection>
          )}
          {verdict.missing.length > 0 && (
            <DetailSection title="Not available here">
              <PillList items={verdict.missing} muted />
            </DetailSection>
          )}
        </div>
      )}

      {topics.length > 0 && (
        <DetailSection title="What reviewers talk about">
          <div className="flex flex-col gap-1.5">
            {topics.slice(0, 8).map((t, ti) => {
              const positive = t.positive ?? 0
              const mentions = t.total ?? positive + (t.negative ?? 0) + (t.neutral ?? 0)
              return (
                <MeterRow
                  key={`${t.name}-${ti}`}
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
            {stay.nearbyPlaces.slice(0, 8).map((n, i) => (
              <li key={`${n.name}-${i}`} className="flex justify-between gap-3">
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
            {stay.essentialInfo.map((info, i) => (
              <li key={`${info}-${i}`}>{info}</li>
            ))}
          </ul>
        </DetailSection>
      )}
    </div>
  )
}
