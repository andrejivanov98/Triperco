'use client'

import { Heading } from '@/components/ui/Heading'

const STARTERS = [
  {
    glyph: '🏖️',
    label: 'Somewhere warm in November',
    prompt: 'Find me somewhere warm and affordable to go in November for a week.',
  },
  {
    glyph: '🏛️',
    label: 'A long weekend in Rome',
    prompt: 'Plan a long weekend in Rome for 2 — flights, a central stay, and the best food.',
  },
  {
    glyph: '🥾',
    label: 'Hiking and hot springs',
    prompt: 'Plan a 5-day trip built around hiking and hot springs.',
  },
  {
    glyph: '🎲',
    label: 'Surprise me',
    prompt: 'Surprise me with a trip idea for next month and build it out.',
  },
]

/** What a first-time traveler sees: one clear invitation and four one-tap starts. */
export function ChatEmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col gap-5 py-6">
      <div className="flex flex-col gap-2">
        <Heading level={1} className="text-3xl">
          Where to next?
        </Heading>
        <p className="max-w-lg text-sm font-medium leading-relaxed text-muted">
          Describe the trip — a city, a vibe, or just a rough idea. Triperco finds real flights,
          stays and things to do, and builds the plan beside you as you chat.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="flex items-center gap-3 rounded-2xl border border-hairline bg-white/60 px-4 py-3 text-left transition hover:border-accent/40 hover:bg-white"
          >
            <span className="text-xl">{s.glyph}</span>
            <span className="text-sm font-semibold text-ink">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
