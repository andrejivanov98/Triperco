import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { rankResults } from '@/lib/ui/rank'
import { ResultCard } from './ResultCard'

const KIND_NOUN: Record<ResultSet['kind'], string> = {
  flights: 'flight options',
  stays: 'places to stay',
  places: 'spots',
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
  const ranked = rankResults(set)
  if (ranked.length === 0) return null

  const hidden = set.items.length - ranked.length

  return (
    <div className="mt-1 flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs font-semibold text-muted">
        <span className="text-ink">
          {set.items.length} {KIND_NOUN[set.kind]}
        </span>
        {set.query && <span>{set.query}</span>}
        {hidden > 0 && <span>· showing the best {ranked.length}</span>}
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {ranked.map(({ item, badges }) => (
          <ResultCard
            key={item.id}
            kind={set.kind}
            item={item}
            badges={badges}
            onOpen={() => onOpen(set, item)}
            onAdd={() => onAdd(set, item)}
          />
        ))}
      </div>
    </div>
  )
}
