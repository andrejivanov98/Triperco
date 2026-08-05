import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DetailPanel } from './DetailPanel'
import type { Flight, Stay, Place, TripMeta } from '@/lib/trip/types'

const meta: TripMeta = { destination: 'Rome', startDate: '2026-09-01', endDate: '2026-09-05', travelers: 2 }

const stay: Stay = {
  id: 's1',
  name: 'Palazzo Nazionale',
  source: 'hotel',
  pricePerNight: 180,
  nights: 4,
  photos: [],
  bookUrl: 'https://book/s',
  propertyToken: 'tok_1',
}

const flight: Flight = {
  id: 'f1',
  from: 'SKP',
  to: 'FCO',
  airline: 'Lufthansa',
  stops: 1,
  price: 240,
  bookUrl: 'https://book/f',
  durationMinutes: 315,
  segments: [
    {
      fromCode: 'SKP',
      fromName: 'Skopje',
      toCode: 'MUC',
      toName: 'Munich',
      departTime: '06:15',
      arriveTime: '07:40',
      airline: 'Lufthansa',
      flightNumber: 'LH 1706',
      aircraft: 'Airbus A320',
      durationMinutes: 85,
    },
    {
      fromCode: 'MUC',
      toCode: 'FCO',
      departTime: '09:15',
      arriveTime: '10:35',
      flightNumber: 'LH 1846',
      durationMinutes: 80,
    },
  ],
  layovers: [{ code: 'MUC', name: 'Munich', durationMinutes: 95 }],
}

const place: Place = {
  id: 'p1',
  name: 'Colosseum',
  photos: [],
  reviewSnippets: [],
  sourceLinks: { maps: 'https://maps/x' },
}

const noop = () => {}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DetailPanel — flights', () => {
  it('renders every segment with its flight number and aircraft', () => {
    render(<DetailPanel kind="flights" item={flight} meta={meta} onClose={noop} onAdd={noop} />)
    expect(screen.getByText(/LH 1706/)).toBeInTheDocument()
    expect(screen.getByText(/Airbus A320/)).toBeInTheDocument()
    expect(screen.getByText(/LH 1846/)).toBeInTheDocument()
  })

  it('shows the layover between segments', () => {
    render(<DetailPanel kind="flights" item={flight} meta={meta} onClose={noop} onAdd={noop} />)
    expect(screen.getByText(/1h 35m in Munich/)).toBeInTheDocument()
  })

  it('does not call the enrichment API for a flight', () => {
    render(<DetailPanel kind="flights" item={flight} meta={meta} onClose={noop} onAdd={noop} />)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('DetailPanel — stays', () => {
  it('fetches full property detail and renders amenities and reviews', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          stay: {
            ...stay,
            description: 'Rooftop bar with city views.',
            amenities: ['Free Wi-Fi', 'Pool'],
            checkInTime: '3:00 PM',
            reviewSnippets: [{ text: 'Spotless and central.' }],
          },
        }),
      })),
    )
    render(<DetailPanel kind="stays" item={stay} meta={meta} onClose={noop} onAdd={noop} />)

    expect(await screen.findByText(/Rooftop bar with city views/)).toBeInTheDocument()
    expect(screen.getByText('Free Wi-Fi')).toBeInTheDocument()
    expect(screen.getByText('3:00 PM')).toBeInTheDocument()
    expect(screen.getByText(/Spotless and central/)).toBeInTheDocument()

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/stays/details')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      propertyToken: 'tok_1',
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
      adults: 2,
    })
  })

  it('still shows what it already knows when enrichment fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })))
    render(<DetailPanel kind="stays" item={stay} meta={meta} onClose={noop} onAdd={noop} />)
    expect(screen.getByText('Palazzo Nazionale')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(/loading full details/i)).not.toBeInTheDocument())
  })

  it('skips enrichment without a property token', () => {
    render(
      <DetailPanel kind="stays" item={{ ...stay, propertyToken: undefined }} meta={meta} onClose={noop} onAdd={noop} />,
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('skips enrichment when the trip has no dates', () => {
    render(
      <DetailPanel kind="stays" item={stay} meta={{ travelers: 2 }} onClose={noop} onAdd={noop} />,
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('DetailPanel — places', () => {
  it('fetches reviews and photos on open', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          reviews: [{ rating: 5, text: 'Breathtaking at sunset.' }],
          photos: ['https://p/1'],
        }),
      })),
    )
    render(<DetailPanel kind="places" item={place} meta={meta} onClose={noop} onAdd={noop} />)
    expect(await screen.findByText(/Breathtaking at sunset/)).toBeInTheDocument()
    expect(screen.getByAltText(/Colosseum photo 1/)).toBeInTheDocument()
  })
})

describe('DetailPanel — chrome', () => {
  it('closes on the close button and on Escape', () => {
    const onClose = vi.fn()
    render(<DetailPanel kind="flights" item={flight} meta={meta} onClose={onClose} onAdd={noop} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('offers add-to-trip and an outbound booking link', () => {
    const onAdd = vi.fn()
    render(<DetailPanel kind="stays" item={stay} meta={meta} onClose={noop} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /add to trip/i }))
    expect(onAdd).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /book/i })).toHaveAttribute('href', 'https://book/s')
  })

  it('is a dialog', () => {
    render(<DetailPanel kind="flights" item={flight} meta={meta} onClose={noop} onAdd={noop} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
