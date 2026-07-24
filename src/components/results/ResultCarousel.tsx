import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { ResultCard } from './ResultCard'

const KIND_NOUN: Record<ResultSet['kind'], string> = {
  flights: 'flights',
  stays: 'stays',
  places: 'places',
}

export function ResultCarousel({
  set,
  onOpen,
  onAdd,
}: {
  set: ResultSet
  onOpen: (set: ResultSet, item: Flight | Stay | Place) => void
  onAdd: (set: ResultSet, item: Flight | Stay | Place) => void
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="text-xs font-semibold text-muted">
        {set.items.length} {KIND_NOUN[set.kind]}
        {set.query ? ` · ${set.query}` : ''}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {set.items.map((item) => (
          <ResultCard
            key={item.id}
            kind={set.kind}
            item={item}
            onOpen={() => onOpen(set, item)}
            onAdd={() => onAdd(set, item)}
          />
        ))}
      </div>
    </div>
  )
}
