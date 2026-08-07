import { describe, it, expect } from 'vitest'
import { createPlannerAgent, activeToolNames } from './plannerAgent'
import { createTrip, addFlight, setMeta } from '../trip/tripState'
import { planStage } from '../trip/stage'

const ALL = [
  'setTripMeta',
  'searchFlights',
  'searchHotels',
  'searchPlaces',
  'getStayDetails',
  'getTransferOptions',
  'suggestReplies',
  'presentOptions',
  'askTripDetail',
  'askPreferences',
] as const

/** The trip from the reported bug: nothing left to ask before a flight search. */
function tenerife() {
  return setMeta(createTrip('t'), {
    destination: 'Tenerife',
    origin: 'SKP',
    startDate: '2027-03-19',
    endDate: '2027-03-28',
    travelers: 2,
  })
}

describe('createPlannerAgent', () => {
  it('creates an agent and initializes state from the given trip', () => {
    const trip = addFlight(createTrip('t1'), {
      id: 'f1', from: 'A', to: 'B', stops: 0, price: 50, bookUrl: 'https://a',
    })
    const { agent, state } = createPlannerAgent({ trip })
    expect(agent).toBeTruthy()
    expect(state.trip.id).toBe('t1')
    expect(state.trip.flights).toHaveLength(1)
    expect(state.lastFlights).toEqual([])
  })

  it('defaults to a fresh draft trip', () => {
    const { state } = createPlannerAgent()
    expect(state.trip.id).toBe('draft')
    expect(state.trip.flights).toEqual([])
  })

  it('reports the stage it built the agent for', () => {
    expect(createPlannerAgent({ trip: tenerife() }).stage.stage).toBe('transport')
  })
})

/**
 * The structural half of the fix for a turn that promises a search and does not run one.
 *
 * Withholding the tools that end a turn with a question is stronger than asking the model not to
 * use them: at a delivery stage, offering a menu instead of the search is not a move it can make.
 */
describe('activeToolNames', () => {
  it('withholds every way of asking at a stage whose job is to search', () => {
    const active = activeToolNames(ALL, planStage(tenerife()))
    expect(active).not.toContain('presentOptions')
    expect(active).not.toContain('askTripDetail')
    expect(active).not.toContain('askPreferences')
  })

  it('keeps every search available even so, so an off-stage request is still answerable', () => {
    const active = activeToolNames(ALL, planStage(tenerife()))
    for (const tool of ['searchFlights', 'searchHotels', 'searchPlaces', 'getStayDetails']) {
      expect(active).toContain(tool)
    }
  })

  it('always keeps setTripMeta and suggestReplies, which every turn needs', () => {
    for (const trip of [createTrip('t'), tenerife()]) {
      const active = activeToolNames(ALL, planStage(trip))
      expect(active).toContain('setTripMeta')
      expect(active).toContain('suggestReplies')
    }
  })

  it('allows exactly the calendar-style question at a stage that must ask', () => {
    const needsDates = setMeta(createTrip('t'), { destination: 'Tenerife' })
    const active = activeToolNames(ALL, planStage(needsDates))
    expect(active).toContain('askTripDetail')
    expect(active).not.toContain('presentOptions')
    expect(active).not.toContain('askPreferences')
  })

  it('withholds nothing at all while there is no destination', () => {
    expect(activeToolNames(ALL, planStage(createTrip('t')))).toEqual([...ALL])
  })
})
