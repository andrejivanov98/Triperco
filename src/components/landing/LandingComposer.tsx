'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EXAMPLES = [
  'A week in Japan in April, great food, mid budget',
  'Cheap sun in November, direct flights only',
  '4 days in Rome with a 6-year-old',
]

/**
 * The way in: one free-text prompt that becomes the first chat message. Dates and travelers are
 * there for people who already know them, folded away for everyone else.
 */
export function LandingComposer() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [travelers, setTravelers] = useState(1)

  function submit() {
    const params = new URLSearchParams()
    if (prompt.trim()) params.set('q', prompt.trim())
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    if (travelers !== 1) params.set('travelers', String(travelers))
    const qs = params.toString()
    router.push(qs ? `/plan?${qs}` : '/plan')
  }

  const field =
    'rounded-xl border border-hairline bg-white/70 px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-accent/50 placeholder:text-muted'

  return (
    <form
      role="form"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="glass flex w-full max-w-2xl flex-col gap-3 p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your trip…"
          className="flex-1 rounded-2xl border border-hairline bg-white/70 px-4 py-3.5 text-base font-medium text-ink outline-none transition focus:border-accent/50 placeholder:text-muted"
        />
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-accent/25 transition hover:bg-accent-600"
        >
          Start planning →
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!showDetails ? (
          <>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="rounded-full border border-hairline bg-white/50 px-3 py-1 text-xs font-semibold text-muted transition hover:text-ink"
            >
              + Dates &amp; travelers
            </button>
            {EXAMPLES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setPrompt(e)}
                className="hidden rounded-full border border-hairline bg-white/50 px-3 py-1 text-xs font-medium text-muted transition hover:text-ink sm:inline"
              >
                {e}
              </button>
            ))}
          </>
        ) : (
          <>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-label="Start date"
              className={field}
            />
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label="End date"
              className={field}
            />
            <div className={`${field} inline-flex items-center gap-3`}>
              <button
                type="button"
                aria-label="Remove traveler"
                onClick={() => setTravelers((n) => Math.max(1, n - 1))}
                className="text-muted transition hover:text-ink"
              >
                −
              </button>
              <span aria-label="travelers">
                {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
              </span>
              <button
                type="button"
                aria-label="Add traveler"
                onClick={() => setTravelers((n) => n + 1)}
                className="text-muted transition hover:text-ink"
              >
                +
              </button>
            </div>
          </>
        )}
      </div>
    </form>
  )
}
