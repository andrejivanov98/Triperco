import { describe, it, expect } from 'vitest'
import { tripRecap } from './recap'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from './tripState'
import type { Flight, Stay, TripState } from './types'

const outbound: Flight = {
  id: 'f1',
  from: 'SKP',
  to: 'FCO',
  airline: 'Wizz Air',
  departDate: '2027-03-19',
  departTime: '07:15',
  arriveTime: '09:05',
  durationMinutes: 110,
  stops: 0,
  price: 120,
  bookUrl: 'x',
}

const homeward: Flight = {
  ...outbound,
  id: 'f2',
  from: 'FCO',
  to: 'SKP',
  direction: 'return',
  departDate: '2027-03-24',
  price: 140,
}

const hotel: Stay = {
  id: 's1',
  name: 'Hotel Artemide',
  source: 'hotel',
  pricePerNight: 120,
  nights: 5,
  photos: [],
  bookUrl: 'x',
  address: 'Via Nazionale 22, Rome',
}

function fullTrip(): TripState {
  const base = setMeta(createTrip('t1'), {
    destination: 'Rome',
    startDate: '2027-03-19',
    endDate: '2027-03-24',
    travelers: 2,
    title: 'Roman Spring',
  })
  const withFlights = addFlight(addFlight(base, outbound), homeward)
  return addItineraryItem(addStay(withFlights, hotel), 0, {
    placeId: 'p1',
    name: 'Colosseum',
    category: 'Historical landmark',
    address: 'Piazza del Colosseo 1, Rome',
  })
}

/**
 * Built from the plan rather than asked of the model, and every one of these tests is about that.
 * The recap is the turn where the traveler stops planning and starts trusting the answer, so a line
 * carrying a price nobody was quoted or a flight nobody chose would be worse than no recap at all.
 */
describe('tripRecap', () => {
  it('names the trip and says where, when and how many', () => {
    const recap = tripRecap(fullTrip())
    expect(recap.title).toBe('Roman Spring')
    expect(recap.subtitle).toContain('Rome')
    expect(recap.subtitle).toContain('Mar 19 – 24')
    expect(recap.subtitle).toContain('2 travelers')
  })

  it('falls back to the destination when the trip was never named', () => {
    const trip = setMeta(createTrip('t1'), { destination: 'Rome', travelers: 1 })
    expect(tripRecap(trip).title).toBe('Rome trip')
  })

  it('reads in travel order: out, bed, days, home', () => {
    const steps = tripRecap(fullTrip()).steps
    expect(steps[0]).toContain('Fly out')
    expect(steps[1]).toContain('Stay at Hotel Artemide')
    expect(steps[2]).toContain('Colosseum')
    expect(steps[3]).toContain('Fly home')
  })

  it('carries the real detail of a flight, and nothing invented', () => {
    const [first] = tripRecap(fullTrip()).steps
    expect(first).toContain('SKP → FCO')
    expect(first).toContain('2027-03-19')
    expect(first).toContain('07:15–09:05')
    expect(first).toContain('Wizz Air')
    expect(first).toContain('Nonstop')
    // Priced per traveler by the provider, so the line shows what the two of them actually pay.
    expect(first).toContain('$240')
  })

  it('says nothing about money on the paired leg of a round trip', () => {
    // The provider prices the pair as one fare, so the return is carried at zero.
    const trip = addFlight(
      addStay(
        setMeta(createTrip('t1'), { destination: 'Rome', travelers: 1 }),
        hotel,
      ),
      { ...homeward, price: 0 },
    )
    const line = tripRecap(trip).steps.find((s) => s.includes('Fly home'))!
    expect(line).not.toMatch(/\$/)
  })

  it('carries the nights and the address of the stay', () => {
    const line = tripRecap(fullTrip()).steps.find((s) => s.includes('Hotel Artemide'))!
    expect(line).toContain('5 nights')
    expect(line).toContain('Via Nazionale 22, Rome')
    expect(line).toContain('$600')
  })

  it('counts the journeys between the places rather than repeating their times', () => {
    // The real durations live in the plan panel; two copies of a number can disagree.
    const line = tripRecap(fullTrip()).steps.find((s) => s.startsWith('Getting around'))
    expect(line).toBeDefined()
    expect(line).toMatch(/\d+ journeys/)
  })

  it('totals what the plan actually holds', () => {
    // Two travelers on a $120 outbound and a $140 return, plus five nights at $120.
    expect(tripRecap(fullTrip()).total).toBe('$1,120')
  })

  it('leaves the total off a plan with nothing priced in it', () => {
    const trip = setMeta(createTrip('t1'), { destination: 'Rome', travelers: 1 })
    expect(tripRecap(trip).total).toBeUndefined()
  })

  it('reads sensibly on a half-planned trip rather than throwing', () => {
    const trip = addFlight(setMeta(createTrip('t1'), { destination: 'Rome', travelers: 1 }), outbound)
    const recap = tripRecap(trip)
    expect(recap.steps).toHaveLength(1)
    expect(recap.steps[0]).toContain('SKP → FCO')
  })

  it('has nothing to say about an empty plan', () => {
    expect(tripRecap(createTrip('t1')).steps).toEqual([])
  })
})
