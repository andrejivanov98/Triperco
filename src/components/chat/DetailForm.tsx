'use client'

import { useState } from 'react'
import type { DetailRequest } from '@/lib/ui/interactions'
import { describeRange, type DateRange } from '@/lib/ui/calendar'
import { describeGuests, DEFAULT_GUESTS, type Guests } from '@/lib/ui/guests'
import { DESTINATION_OPENINGS } from '@/lib/trip/intake'
import { DateRangePicker } from '@/components/landing/DateRangePicker'
import { GuestPicker } from '@/components/landing/GuestPicker'
import { GuidedCard, GuidedRow } from './GuidedCard'
import { Icon } from '@/components/ui/Icon'

/**
 * Rough bands rather than a number field. Someone who has not settled on a figure can still say
 * which shape of trip they mean, and "no fixed budget" is a real answer we must not force them past.
 */
const BUDGET_BANDS = [
  'Keep it cheap',
  'Mid-range is fine',
  'Treat ourselves',
  'No fixed budget',
] as const

/** Answered in the traveler's own words, so the agent reads it exactly as if they had typed it. */
function datesAnswer(range: DateRange): string {
  if (!range.start) return ''
  if (!range.end) return `Leaving ${range.start}`
  return `${range.start} to ${range.end}`
}

/**
 * The control that actually answers the question the agent asked.
 *
 * Every field submits a plain sentence as the traveler's own message, so nothing downstream needs a
 * special case: the agent reads a chosen date range exactly as it would read a typed one.
 */
export function DetailForm({
  request,
  onSubmit,
  onSkip,
  today,
}: {
  request: DetailRequest
  onSubmit: (text: string) => void
  onSkip: () => void
  /** Injectable so calendar tests stay deterministic. */
  today?: Date
}) {
  const [range, setRange] = useState<DateRange>({})
  const [guests, setGuests] = useState<Guests>(DEFAULT_GUESTS)

  if (request.field === 'dates') {
    return (
      <GuidedCard
        title={request.question}
        freeTextPlaceholder="…or describe it, like “a week in May”"
        onFreeText={onSubmit}
        footerRight={
          <button
            type="button"
            onClick={() => onSubmit(datesAnswer(range))}
            disabled={!range.start}
            className="flex items-center gap-1.5 rounded-full bg-deep px-4 py-2 text-xs font-bold text-white transition hover:bg-ink disabled:opacity-40"
          >
            {range.start ? describeRange(range) : 'Pick dates'}
            <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </button>
        }
      >
        <div className="border-t border-hairline">
          <DateRangePicker range={range} onChange={setRange} today={today} />
        </div>
      </GuidedCard>
    )
  }

  if (request.field === 'party') {
    return (
      <GuidedCard
        title={request.question}
        freeTextPlaceholder="…or say it in your own words"
        onFreeText={onSubmit}
        footerRight={
          <button
            type="button"
            onClick={() => onSubmit(describeGuests(guests))}
            className="flex items-center gap-1.5 rounded-full bg-deep px-4 py-2 text-xs font-bold text-white transition hover:bg-ink"
          >
            {describeGuests(guests)}
            <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </button>
        }
      >
        <div className="border-t border-hairline">
          <GuestPicker guests={guests} onChange={setGuests} />
        </div>
      </GuidedCard>
    )
  }

  if (request.field === 'budget') {
    return (
      <GuidedCard
        title={request.question}
        freeTextPlaceholder="…or name a figure"
        onFreeText={onSubmit}
        onSkip={onSkip}
      >
        {BUDGET_BANDS.map((band) => (
          <GuidedRow key={band} label={band} onClick={() => onSubmit(band)} />
        ))}
      </GuidedCard>
    )
  }

  if (request.field === 'destination') {
    /*
     * Somewhere to go, with a way out of the blank page.
     *
     * A traveler who knows where they are going types it; one who does not is stuck staring at an
     * empty field, and "anywhere warm" is a real answer this app can act on. The shapes below are
     * openings, not destinations — the concierge turns each into somewhere real.
     */
    return (
      <GuidedCard
        title={request.question}
        freeTextPlaceholder="…a city, a country, or just a vibe"
        onFreeText={onSubmit}
      >
        {DESTINATION_OPENINGS.map((shape) => (
          <GuidedRow key={shape} label={shape} onClick={() => onSubmit(shape)} />
        ))}
      </GuidedCard>
    )
  }

  // Origin: no control beats typing a city, so the card is just a focused place to type one.
  return (
    <GuidedCard
      title={request.question}
      freeTextPlaceholder="…the city or airport you fly from"
      onFreeText={onSubmit}
      onSkip={onSkip}
    />
  )
}
