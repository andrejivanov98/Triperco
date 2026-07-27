'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_GUESTS, describeGuests, isDefaultGuests, type Guests } from '@/lib/ui/guests'
import { describeRange, type DateRange } from '@/lib/ui/calendar'
import { Popover } from '@/components/ui/Popover'
import { GuestPicker } from './GuestPicker'
import { DateRangePicker } from './DateRangePicker'

const EXAMPLES = [
  'A week in Japan in April, great food, mid budget',
  'Cheap sun in November, direct flights only',
  '4 days in Rome with a 6-year-old',
]

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
      <path d="M16 11.2a2.8 2.8 0 1 0 0-5.4M17.5 18.6c0-2.2-.9-3.6-2.3-4.4" strokeLinecap="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
      <path d="M3.5 10.5h17M8 3.5v3.5M16 3.5v3.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The way in: one free-text prompt that becomes the first chat message, with who's travelling and
 * when available as optional structured context.
 */
export function LandingComposer() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [guests, setGuests] = useState<Guests>(DEFAULT_GUESTS)
  const [range, setRange] = useState<DateRange>({})
  const [openPanel, setOpenPanel] = useState<'guests' | 'dates' | null>(null)

  function submit() {
    const params = new URLSearchParams()
    if (prompt.trim()) params.set('q', prompt.trim())
    if (range.start) params.set('start', range.start)
    if (range.end) params.set('end', range.end)
    if (!isDefaultGuests(guests)) {
      params.set('rooms', String(guests.rooms))
      params.set('adults', String(guests.adults))
      if (guests.children > 0) params.set('children', String(guests.children))
    }
    const qs = params.toString()
    router.push(qs ? `/plan?${qs}` : '/plan')
  }

  const toggle = (panel: 'guests' | 'dates') =>
    setOpenPanel((current) => (current === panel ? null : panel))

  const chip =
    'flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-2 text-xs font-bold text-ink transition hover:border-accent/50'

  return (
    <form
      role="form"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="w-full max-w-2xl"
    >
      <div className="glass flex flex-col gap-3 p-4">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Triperco anything"
          className="w-full bg-transparent px-1 text-base font-medium text-ink outline-none placeholder:text-muted"
        />

        <div className="flex items-center gap-2">
          <div className="relative">
            <button type="button" onClick={() => toggle('guests')} className={chip} aria-expanded={openPanel === 'guests'}>
              <PeopleIcon />
              {isDefaultGuests(guests) ? 'Who' : describeGuests(guests)}
              <span className="text-[10px] text-muted">▾</span>
            </button>
            <Popover open={openPanel === 'guests'} onClose={() => setOpenPanel(null)} label="Guests and rooms">
              <GuestPicker guests={guests} onChange={setGuests} />
            </Popover>
          </div>

          <div className="relative">
            <button type="button" onClick={() => toggle('dates')} className={chip} aria-expanded={openPanel === 'dates'}>
              <CalendarIcon />
              {range.start ? describeRange(range) : 'When'}
            </button>
            <Popover open={openPanel === 'dates'} onClose={() => setOpenPanel(null)} label="Trip dates">
              <DateRangePicker range={range} onChange={setRange} />
            </Popover>
          </div>

          <button
            type="submit"
            aria-label="Start planning"
            className="ml-auto rounded-full bg-deep px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-deep/20 transition hover:opacity-90"
          >
            Start planning →
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setPrompt(e)}
            className="hidden rounded-full border border-hairline bg-white/60 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-ink sm:inline"
          >
            {e}
          </button>
        ))}
      </div>
    </form>
  )
}
