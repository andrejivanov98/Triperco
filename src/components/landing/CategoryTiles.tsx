import Link from 'next/link'

interface Category {
  label: string
  glyph: string
  prompt: string
  gradient: string
}

const CATEGORIES: Category[] = [
  { label: 'Hotels & homes', glyph: '🏠', prompt: 'Help me find a great place to stay.', gradient: 'from-accent-050 to-sand' },
  { label: 'Flights', glyph: '✈️', prompt: 'Help me find flights for my trip.', gradient: 'from-sand to-accent-050' },
  { label: 'Things to do', glyph: '🎫', prompt: 'Suggest things to do on my trip.', gradient: 'from-accent-050 to-white' },
  { label: 'Destinations', glyph: '🧭', prompt: 'Help me choose where to go.', gradient: 'from-sand to-white' },
]

export function CategoryTiles() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {CATEGORIES.map((c) => (
        <Link
          key={c.label}
          href={`/plan?q=${encodeURIComponent(c.prompt)}`}
          className="glass group flex flex-col gap-2 overflow-hidden p-0"
        >
          <div
            className={`flex h-24 w-full items-center justify-center bg-gradient-to-br ${c.gradient} text-3xl transition group-hover:scale-[1.03]`}
          >
            {c.glyph}
          </div>
          <div className="px-3 pb-3 text-sm font-bold text-ink">{c.label}</div>
        </Link>
      ))}
    </div>
  )
}
