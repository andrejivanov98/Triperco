import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DayCard } from './DayCard'
import type { Day } from '@/lib/trip/types'

const day: Day = {
  items: [
    { placeId: 'p1', name: 'Colosseum' },
    { placeId: 'p2', name: 'Trastevere dinner' },
  ],
}

describe('DayCard', () => {
  it('labels the day (1-based) and lists items', () => {
    render(<DayCard day={day} index={0} />)
    expect(screen.getByText(/Day 1/)).toBeInTheDocument()
    expect(screen.getByText(/Colosseum/)).toBeInTheDocument()
    expect(screen.getByText(/Trastevere dinner/)).toBeInTheDocument()
  })
})
