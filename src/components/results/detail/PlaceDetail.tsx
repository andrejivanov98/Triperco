import type { Place } from '@/lib/trip/types'
import { formatRating } from '@/lib/ui/format'
import { Heading } from '@/components/ui/Heading'
import { Icon } from '@/components/ui/Icon'
import { DetailSection, FactGrid, Gallery, PillList, ReviewList } from './DetailPrimitives'

export function PlaceDetail({
  place,
  loading,
  onOpenPhotos,
}: {
  place: Place
  loading?: boolean
  onOpenPhotos?: (index: number) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <Gallery photos={place.photos} title={place.name} onOpen={onOpenPhotos} />

      <div>
        <Heading level={2} className="text-2xl">
          {place.name}
        </Heading>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-muted">
          {place.category && <span>{place.category}</span>}
          {place.priceRange && <span>{place.priceRange}</span>}
          {formatRating(place.rating, place.reviewCount) && (
            <span className="text-ink">{formatRating(place.rating, place.reviewCount)}</span>
          )}
          {place.openNow !== undefined && (
            <span className={place.openNow ? 'text-accent-600' : 'text-muted'}>
              {place.openNow ? 'Open now' : 'Closed now'}
            </span>
          )}
        </div>
      </div>

      {place.description && (
        <p className="text-sm font-medium leading-relaxed text-ink">{place.description}</p>
      )}

      <FactGrid
        facts={[
          { label: 'Address', value: place.address },
          { label: 'Hours', value: place.hours },
          { label: 'Phone', value: place.phone },
        ]}
      />

      {place.serviceOptions && place.serviceOptions.length > 0 && (
        <DetailSection title="Good to know">
          <PillList items={place.serviceOptions} />
        </DetailSection>
      )}

      {place.hoursByDay && place.hoursByDay.length > 0 && (
        <DetailSection title="Opening hours">
          <ul className="flex flex-col gap-1 text-sm font-medium text-ink">
            {place.hoursByDay.map((h, i) => (
              <li key={`${h.day}-${i}`} className="flex justify-between gap-3">
                <span>{h.day}</span>
                <span className="text-muted">{h.hours}</span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {loading && (
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Loading reviews…
          </span>
          <div className="h-3 w-2/3 animate-pulse rounded bg-sand" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-sand" />
        </div>
      )}

      <ReviewList reviews={place.reviewSnippets ?? []} title="What visitors say" />

      {place.website && (
        <a
          href={place.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-accent"
        >
          Visit website
          <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}
