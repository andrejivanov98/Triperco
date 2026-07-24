import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCard } from './ResultCard'
import type { Stay } from '@/lib/trip/types'

const stay: Stay = {
  id: 's1', name: "Guido's Apartments", source: 'airbnb', rating: 4.8, reviewCount: 56,
  pricePerNight: 100, nights: 14, photos: ['https://img/x.jpg'], bookUrl: 'https://air/1',
}

describe('ResultCard (stay)', () => {
  it('renders name, rating·reviews and per-night price', () => {
    render(<ResultCard kind="stays" item={stay} onOpen={() => {}} onAdd={() => {}} />)
    expect(screen.getByText("Guido's Apartments")).toBeInTheDocument()
    expect(screen.getByText(/4\.8/)).toBeInTheDocument()
    expect(screen.getByText(/56/)).toBeInTheDocument()
    expect(screen.getByText('$100/night')).toBeInTheDocument()
  })

  it('calls onOpen when the card body is clicked and onAdd from the Add button', () => {
    const onOpen = vi.fn()
    const onAdd = vi.fn()
    render(<ResultCard kind="stays" item={stay} onOpen={onOpen} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    expect(onOpen).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /add to trip/i }))
    expect(onAdd).toHaveBeenCalled()
  })
})
