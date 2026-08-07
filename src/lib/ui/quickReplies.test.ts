import { describe, it, expect } from 'vitest'
import { suggestQuickReplies } from './quickReplies'
import { planStage } from '@/lib/trip/stage'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from '@/lib/trip/tripState'
import type { TripState, Flight } from '@/lib/trip/types'

const outbound: Flight = { id: 'f1', from: 'SKP', to: 'FCO', stops: 0, price: 180, bookUrl: '' }
const homeward: Flight = {
  id: 'f2',
  from: 'FCO',
  to: 'SKP',
  stops: 0,
  price: 160,
  bookUrl: '',
  direction: 'return',
}
const stay = {
  id: 's1',
  name: 'Hotel X',
  source: 'hotel' as const,
  pricePerNight: 100,
  nights: 3,
  photos: [],
  bookUrl: '',
}

function dated(): TripState {
  return setMeta(createTrip('t'), {
    destination: 'Rome',
    origin: 'SKP',
    startDate: '2026-09-01',
    endDate: '2026-09-04',
    travelers: 2,
    adults: 2,
    vibe: ['culture'],
  })
}

function planned(): TripState {
  let t = addFlight(addFlight(dated(), outbound), homeward)
  t = addStay(t, stay)
  t = addItineraryItem(t, 0, { placeId: 'p1', name: 'Colosseum' })
  return setMeta(t, { transfersReviewed: true })
}

describe('suggestQuickReplies', () => {
  it('offers inspiration when there is no destination yet', () => {
    const replies = suggestQuickReplies(createTrip('t'))
    expect(replies.length).toBeGreaterThan(0)
    expect(replies.join(' ')).toMatch(/somewhere|surprise|weekend/i)
  })

  it('asks about dates once a destination is known', () => {
    const trip = setMeta(createTrip('t'), { destination: 'Rome' })
    expect(suggestQuickReplies(trip).join(' ')).toMatch(/date|when|flexible/i)
  })

  it('names the destination in its suggestions', () => {
    expect(suggestQuickReplies(setMeta(createTrip('t'), { destination: 'Rome' })).join(' ')).toContain(
      'Rome',
    )
  })

  it('refines the flight search when nothing is chosen yet', () => {
    expect(suggestQuickReplies(dated()).join(' ')).toMatch(/nonstop|one-way|shift a day/i)
  })

  it('offers the way home once only the outbound is chosen', () => {
    expect(suggestQuickReplies(addFlight(dated(), outbound)).join(' ')).toMatch(/home|back/i)
  })

  it('moves on to refining the stay once both legs are in', () => {
    const trip = addFlight(addFlight(dated(), outbound), homeward)
    expect(suggestQuickReplies(trip).join(' ')).toMatch(/quieter|centre|kitchen|cheaper/i)
  })

  it('moves on to things to do and food once travel and a bed are settled', () => {
    const trip = addStay(addFlight(addFlight(dated(), outbound), homeward), stay)
    expect(suggestQuickReplies(trip).join(' ')).toMatch(/eat|on while|rainy|more like/i)
  })

  it('offers refinements on a complete trip', () => {
    expect(suggestQuickReplies(planned()).join(' ')).toMatch(/cheaper|hidden gem|day by day|summary/i)
  })

  it('never offers more than four at a time', () => {
    for (const trip of [createTrip('t'), dated(), planned()]) {
      expect(suggestQuickReplies(trip).length).toBeLessThanOrEqual(4)
    }
  })

  /*
   * The whole point of routing these through the stage. The chips used to have rules of their own,
   * and under a message about flights to Tenerife they offered "Somewhere warm and cheap" — the app
   * inviting the traveler to reconsider a destination they had already named.
   */
  it('says the same thing about the trip as the agent is being told', () => {
    for (const trip of [createTrip('t'), dated(), planned()]) {
      expect(suggestQuickReplies(trip)).toEqual(planStage(trip).replies)
    }
  })

  it('never offers to pick a destination for a trip that has one', () => {
    for (const trip of [dated(), planned()]) {
      expect(suggestQuickReplies(trip).join(' ')).not.toMatch(/surprise me|somewhere warm/i)
    }
  })
})
