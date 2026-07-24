import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DetailView } from './DetailView'
import type { Stay } from '@/lib/trip/types'

const stay: Stay = {
  id: 's1', name: "Guido's Apartments", source: 'airbnb', rating: 4.8, reviewCount: 56,
  pricePerNight: 100, nights: 14, photos: ['https://img/a.jpg', 'https://img/b.jpg'], bookUrl: 'https://air/1',
}

describe('DetailView (stay)', () => {
  it('renders the title, price, gallery and a book-out link', () => {
    render(<DetailView kind="stays" item={stay} onClose={() => {}} onAdd={() => {}} />)
    expect(screen.getByRole('heading', { name: "Guido's Apartments" })).toBeInTheDocument()
    expect(screen.getByText('$1,400')).toBeInTheDocument() // 100 * 14 total
    expect(screen.getAllByRole('img').length).toBe(2)
    const book = screen.getByRole('link', { name: /book on airbnb/i })
    expect(book).toHaveAttribute('href', 'https://air/1')
  })

  it('fires onClose and onAdd', () => {
    const onClose = vi.fn()
    const onAdd = vi.fn()
    render(<DetailView kind="stays" item={stay} onClose={onClose} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onClose).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /add to trip/i }))
    expect(onAdd).toHaveBeenCalled()
  })
})
