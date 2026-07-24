import type { Day } from '@/lib/trip/types'

export function DayCard({ day, index }: { day: Day; index: number }) {
  return (
    <div className="glass p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-accent">
        Day {index + 1}
        {day.date ? ` · ${day.date}` : ''}
      </div>
      <ul className="mt-1 space-y-0.5">
        {day.items.map((item) => (
          <li key={item.placeId} className="text-sm font-medium text-ink">
            {item.name}
            {item.note ? <span className="text-muted"> — {item.note}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
