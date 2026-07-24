'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LandingComposer() {
  const router = useRouter()
  const [dest, setDest] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [travelers, setTravelers] = useState(1)

  function submit() {
    const params = new URLSearchParams()
    if (dest.trim()) params.set('dest', dest.trim())
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    if (travelers !== 1) params.set('travelers', String(travelers))
    const qs = params.toString()
    router.push(qs ? `/plan?${qs}` : '/plan')
  }

  const field =
    'rounded-xl border border-hairline bg-white/60 px-3 py-2 text-sm font-medium text-ink outline-none placeholder:text-muted'

  return (
    <form
      role="form"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="glass flex w-full max-w-xl flex-col gap-3 p-3"
    >
      <input
        value={dest}
        onChange={(e) => setDest(e.target.value)}
        placeholder="Where to? e.g. Tenerife"
        className={`${field} text-base`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start date" className={field} />
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End date" className={field} />
        <div className={`${field} inline-flex items-center gap-3`}>
          <button type="button" aria-label="Remove traveler" onClick={() => setTravelers((n) => Math.max(1, n - 1))}>
            −
          </button>
          <span aria-label="travelers">
            {travelers} {travelers === 1 ? 'traveler' : 'travelers'}
          </span>
          <button type="button" aria-label="Add traveler" onClick={() => setTravelers((n) => n + 1)}>
            +
          </button>
        </div>
        <button
          type="submit"
          className="ml-auto rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white shadow-md shadow-accent/25"
        >
          Plan it →
        </button>
      </div>
    </form>
  )
}
