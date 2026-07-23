import { describe, it, expect } from 'vitest'
import { createPlannerAgent } from './plannerAgent'
import { createTrip, addFlight } from '../trip/tripState'

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
})
