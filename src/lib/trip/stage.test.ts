import { describe, it, expect } from 'vitest'
import { planStage, planStageName, formatStagePlan, stageAdvancePrompt, ASK_TOOLS } from './stage'
import type { PlanStage } from './stage'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from './tripState'
import type { TripState, Flight } from './types'

const outbound: Flight = { id: 'f1', from: 'SKP', to: 'TFS', stops: 0, price: 180, bookUrl: '' }
const homeward: Flight = {
  id: 'f2',
  from: 'TFS',
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

/** The trip the reported bug started from: destination, dates and party typed in one sentence. */
function tenerife(): TripState {
  return setMeta(createTrip('t'), {
    destination: 'Tenerife',
    origin: 'SKP',
    startDate: '2027-03-19',
    endDate: '2027-03-28',
    travelers: 2,
    adults: 2,
  })
}

function withBothFlights(trip: TripState): TripState {
  return addFlight(addFlight(trip, outbound), homeward)
}

describe('planStageName', () => {
  it('starts by settling where they are going', () => {
    expect(planStageName(createTrip('t'))).toBe('destination')
  })

  it('asks for dates once the destination is known', () => {
    expect(planStageName(setMeta(createTrip('t'), { destination: 'Tenerife' }))).toBe('dates')
  })

  it('asks where they fly from when only that is missing', () => {
    const trip = setMeta(createTrip('t'), {
      destination: 'Tenerife',
      startDate: '2027-03-19',
      endDate: '2027-03-28',
    })
    expect(planStageName(trip)).toBe('origin')
  })

  /*
   * The bug this whole module exists for. Everything a flight search needs was on screen, and the
   * agent still answered with a sentence about looking into flights and a menu of destinations.
   */
  it('goes straight to searching transport when nothing is missing', () => {
    expect(planStageName(tenerife())).toBe('transport')
  })

  it('stays on transport until the way home is covered too', () => {
    expect(planStageName(addFlight(tenerife(), outbound))).toBe('transport')
  })

  it('does not re-ask for the origin once a flight is in the plan', () => {
    const noOrigin = setMeta(createTrip('t'), {
      destination: 'Tenerife',
      startDate: '2027-03-19',
      endDate: '2027-03-28',
    })
    expect(planStageName(addFlight(noOrigin, outbound))).toBe('transport')
  })

  it('moves to a bed once both legs are in', () => {
    expect(planStageName(withBothFlights(tenerife()))).toBe('stay')
  })

  it('moves to things to do once there is a bed', () => {
    expect(planStageName(addStay(withBothFlights(tenerife()), stay))).toBe('activities')
  })

  it('asks how they get between places once there is something to get to', () => {
    const trip = addItineraryItem(addStay(withBothFlights(tenerife()), stay), 0, {
      placeId: 'p1',
      name: 'Teide',
    })
    expect(planStageName(trip)).toBe('connections')
  })

  it('is complete once the journeys between places have been answered', () => {
    let trip = addItineraryItem(addStay(withBothFlights(tenerife()), stay), 0, {
      placeId: 'p1',
      name: 'Teide',
    })
    trip = setMeta(trip, { transfersReviewed: true })
    expect(planStageName(trip)).toBe('complete')
  })
})

/**
 * Somebody driving down, or staying with family, has settled that part as surely as booking it.
 * Without this the planner would offer the same step forever to a traveler who already said no.
 */
describe('planStageName — parts the traveler is handling themselves', () => {
  it('treats skipped transport as settled', () => {
    expect(planStageName(setMeta(tenerife(), { skipped: ['transport'] }))).toBe('stay')
  })

  it('treats skipped transport and stay as settled', () => {
    expect(planStageName(setMeta(tenerife(), { skipped: ['transport', 'stay'] }))).toBe('activities')
  })

  it('reaches the end when every part is handled elsewhere', () => {
    const trip = setMeta(tenerife(), { skipped: ['transport', 'stay', 'activities'] })
    expect(planStageName(trip)).toBe('complete')
  })
})

describe('planStage — what each stage allows', () => {
  /*
   * The structural half of the fix. A stage whose job is to put options on screen has no tool that
   * ends the turn with a question, so "here are four things I could do instead" is not a move the
   * model can make — rather than a move the prompt asks it not to make.
   */
  it('gives the delivery stages no way to ask instead of searching', () => {
    for (const trip of [
      tenerife(),
      withBothFlights(tenerife()),
      addStay(withBothFlights(tenerife()), stay),
    ]) {
      const plan = planStage(trip)
      expect(plan.askTools).toEqual([])
      expect(plan.delivers).toBe(true)
    }
  })

  it('lets the question stages ask, and expects nothing rendered', () => {
    for (const stageName of ['dates', 'origin'] as const) {
      const trip =
        stageName === 'dates'
          ? setMeta(createTrip('t'), { destination: 'Tenerife' })
          : setMeta(createTrip('t'), {
              destination: 'Tenerife',
              startDate: '2027-03-19',
              endDate: '2027-03-28',
            })
      const plan = planStage(trip)
      expect(plan.stage).toBe(stageName)
      expect(plan.askTools).toEqual(['askTripDetail'])
      expect(plan.delivers).toBe(false)
    }
  })

  it('opens every question up again at the start and at the end', () => {
    let done = addItineraryItem(addStay(withBothFlights(tenerife()), stay), 0, {
      placeId: 'p1',
      name: 'Teide',
    })
    done = setMeta(done, { transfersReviewed: true })
    for (const trip of [createTrip('t'), done]) {
      expect(planStage(trip).askTools).toEqual([...ASK_TOOLS])
    }
  })

  it('always offers somewhere to go next, and never more than four', () => {
    const trips = [
      createTrip('t'),
      setMeta(createTrip('t'), { destination: 'Tenerife' }),
      tenerife(),
      withBothFlights(tenerife()),
      addStay(withBothFlights(tenerife()), stay),
    ]
    for (const trip of trips) {
      const { replies } = planStage(trip)
      expect(replies.length).toBeGreaterThan(0)
      expect(replies.length).toBeLessThanOrEqual(4)
    }
  })

  it('never leaves a stage without something to say when it delivers nothing', () => {
    for (const trip of [createTrip('t'), tenerife(), addStay(withBothFlights(tenerife()), stay)]) {
      expect(planStage(trip).nudge.length).toBeGreaterThan(0)
    }
  })

  it('names the destination in the chips it offers about it', () => {
    expect(planStage(setMeta(createTrip('t'), { destination: 'Tenerife' })).replies.join(' ')).toContain(
      'Tenerife',
    )
  })

  it('offers inspiration only while there is genuinely no destination', () => {
    expect(planStage(createTrip('t')).replies.join(' ')).toMatch(/somewhere|surprise|weekend/i)
    // The reported bug: these were shown under a message about flights to Tenerife.
    expect(planStage(tenerife()).replies.join(' ')).not.toMatch(/surprise|somewhere warm/i)
  })
})

describe('formatStagePlan', () => {
  it('states the goal and that the traveler outranks it', () => {
    const text = formatStagePlan(planStage(tenerife()))
    expect(text).toContain('THIS TURN')
    expect(text.toLowerCase()).toContain('their words beat this')
  })
})

describe('stageAdvancePrompt', () => {
  it('picks the conversation up at each stage reached by adding something', () => {
    for (const stage of ['stay', 'activities', 'connections', 'complete'] as const) {
      expect(stageAdvancePrompt(stage)).toBeTruthy()
    }
  })

  it('stays quiet at the stages reached by talking', () => {
    for (const stage of ['destination', 'dates', 'origin', 'transport'] as PlanStage[]) {
      expect(stageAdvancePrompt(stage)).toBeNull()
    }
  })
})
