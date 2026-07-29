import { describe, it, expect } from 'vitest'
import {
  DEFAULT_GUESTS,
  stepGuests,
  canStep,
  describeGuests,
  isDefaultGuests,
  totalTravelers,
} from './guests'

describe('stepGuests', () => {
  it('adds and removes within range', () => {
    expect(stepGuests(DEFAULT_GUESTS, 'adults', 1).adults).toBe(2)
    expect(stepGuests({ rooms: 2, adults: 3, children: 1 }, 'children', -1).children).toBe(0)
  })

  it('never drops rooms or adults below one, or children below zero', () => {
    expect(stepGuests(DEFAULT_GUESTS, 'rooms', -1).rooms).toBe(1)
    expect(stepGuests(DEFAULT_GUESTS, 'adults', -1).adults).toBe(1)
    expect(stepGuests(DEFAULT_GUESTS, 'children', -1).children).toBe(0)
  })

  it('caps at a sane maximum', () => {
    expect(stepGuests({ rooms: 8, adults: 16, children: 10 }, 'rooms', 1).rooms).toBe(8)
    expect(stepGuests({ rooms: 8, adults: 16, children: 10 }, 'adults', 1).adults).toBe(16)
  })

  it('leaves the other fields alone', () => {
    expect(stepGuests({ rooms: 2, adults: 2, children: 1 }, 'adults', 1)).toEqual({
      rooms: 2,
      adults: 3,
      children: 1,
    })
  })
})

describe('canStep', () => {
  it('reports whether a step is allowed, so buttons can disable', () => {
    expect(canStep(DEFAULT_GUESTS, 'adults', -1)).toBe(false)
    expect(canStep(DEFAULT_GUESTS, 'adults', 1)).toBe(true)
    expect(canStep({ rooms: 8, adults: 2, children: 0 }, 'rooms', 1)).toBe(false)
  })
})

describe('describeGuests', () => {
  it('reads naturally and hides zero children', () => {
    expect(describeGuests({ rooms: 1, adults: 1, children: 0 })).toBe('1 adult · 1 room')
    expect(describeGuests({ rooms: 2, adults: 3, children: 1 })).toBe('3 adults · 1 child · 2 rooms')
    expect(describeGuests({ rooms: 1, adults: 2, children: 3 })).toBe('2 adults · 3 children · 1 room')
  })
})

describe('isDefaultGuests / totalTravelers', () => {
  it('spots an untouched selection', () => {
    expect(isDefaultGuests(DEFAULT_GUESTS)).toBe(true)
    expect(isDefaultGuests({ rooms: 1, adults: 2, children: 0 })).toBe(false)
  })

  it('counts children as travelers', () => {
    expect(totalTravelers({ rooms: 1, adults: 2, children: 2 })).toBe(4)
  })
})
