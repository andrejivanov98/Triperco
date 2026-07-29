import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddButton, PRESSABLE } from './AddButton'
import { plannedIds } from '@/lib/trip/planned'
import { createTrip } from '@/lib/trip/tripState'
import type { Flight, Stay, TripState } from '@/lib/trip/types'

describe('AddButton', () => {
  it('invites the press while the item is not in the plan', () => {
    const onAdd = vi.fn()
    render(<AddButton added={false} onAdd={onAdd} label="Add to trip" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to trip' }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('dips under the finger, so a tap is visibly registered', () => {
    render(<AddButton added={false} onAdd={() => {}} label="Add to trip" />)
    expect(screen.getByRole('button').className).toContain('active:scale-')
    expect(PRESSABLE).toContain('active:scale-')
  })

  it('stops being a button once the item is in the plan', () => {
    render(<AddButton added onAdd={() => {}} label="Add to trip" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByTestId('added-state')).toHaveTextContent(/added/i)
  })

  it('announces the change to a screen reader rather than only colouring it', () => {
    render(<AddButton added onAdd={() => {}} label="Add" addedLabel="In your plan" />)
    const state = screen.getByTestId('added-state')
    expect(state).toHaveAttribute('aria-live', 'polite')
    expect(state).toHaveTextContent('In your plan')
  })
})

function flight(id: string, over: Partial<Flight> = {}): Flight {
  return { id, from: 'SKP', to: 'FCO', stops: 0, price: 100, bookUrl: 'x', ...over }
}
function stay(id: string): Stay {
  return { id, name: id, source: 'hotel', pricePerNight: 1, nights: 1, photos: [], bookUrl: 'x' }
}
function trip(over: Partial<TripState> = {}): TripState {
  return { ...createTrip('t'), ...over }
}

describe('plannedIds', () => {
  it('is empty for a fresh trip', () => {
    expect(plannedIds(trip()).size).toBe(0)
  })

  it('covers flights, stays and things to do', () => {
    const ids = plannedIds(
      trip({
        flights: [flight('f1')],
        stays: [stay('s1')],
        days: [{ items: [{ placeId: 'p1', name: 'Museum' }] }],
      }),
    )
    expect([...ids].sort()).toEqual(['f1', 'p1', 's1'])
  })

  it('counts both legs of a round trip, which is one card but two flights', () => {
    const ids = plannedIds(trip({ flights: [flight('out', { returnLeg: flight('home') })] }))
    expect(ids.has('out')).toBe(true)
    expect(ids.has('home')).toBe(true)
  })
})
