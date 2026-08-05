import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ConnectionsSection } from './ConnectionsSection'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from '@/lib/trip/tripState'
import type { TripState } from '@/lib/trip/types'

function planned(): TripState {
  const base = setMeta(createTrip('t1'), { destination: 'Rome' })
  const withFlight = addFlight(base, {
    id: 'f1',
    from: 'SKP',
    to: 'FCO',
    stops: 0,
    price: 120,
    bookUrl: 'x',
  })
  return addStay(withFlight, {
    id: 's1',
    name: 'Hotel Artemide',
    source: 'hotel',
    pricePerNight: 120,
    nights: 3,
    photos: [],
    bookUrl: 'x',
    address: 'Via Nazionale 22, Rome',
  })
}

function stubTransfers(legs: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ legs }) }) as Response),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('ConnectionsSection', () => {
  it('shows nothing when the plan implies no journey', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<ConnectionsSection trip={createTrip('t1')} />)
    expect(container.firstChild).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('names each leg of the journey', () => {
    stubTransfers({})
    render(<ConnectionsSection trip={planned()} />)
    expect(screen.getByText('Airport to your stay')).toBeInTheDocument()
  })

  it('shows the real durations the provider returned', async () => {
    stubTransfers({
      'arrive:f1:s1': [
        { mode: 'Driving', duration: '27 min', durationSeconds: 1612, distance: '17.5 km' },
        { mode: 'Transit', duration: '53 min', durationSeconds: 3180 },
      ],
    })
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/27 min/)).toBeInTheDocument())
    expect(screen.getByText(/53 min/)).toBeInTheDocument()
    expect(screen.getByText(/17\.5 km/)).toBeInTheDocument()
  })

  it('leads with the fastest option, which is what people plan around', async () => {
    stubTransfers({
      'arrive:f1:s1': [
        { mode: 'Walking', duration: '3 hr 27', durationSeconds: 12429 },
        { mode: 'Driving', duration: '27 min', durationSeconds: 1612 },
      ],
    })
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/27 min/)).toBeInTheDocument())
    const chips = screen.getAllByText(/min|hr/)
    expect(chips[0]).toHaveTextContent('27 min')
  })

  it('says so plainly when no route came back, rather than inventing one', async () => {
    stubTransfers({ 'arrive:f1:s1': [] })
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/no route came back/i)).toBeInTheDocument())
  })

  it('always offers a way to check the route itself', () => {
    stubTransfers({})
    render(<ConnectionsSection trip={planned()} />)
    const link = screen.getByRole('link', { name: /directions/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('google.com/maps/dir'))
    expect(link).toHaveAttribute('href', expect.stringContaining('FCO+airport'))
  })

  it('survives the lookup failing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/no route came back/i)).toBeInTheDocument())
    // The leg is still named and still linkable, which is the part that matters.
    expect(screen.getByText('Airport to your stay')).toBeInTheDocument()
  })

  it('adds a leg for each thing to do', () => {
    stubTransfers({})
    render(
      <ConnectionsSection
        trip={addItineraryItem(planned(), 0, { placeId: 'p1', name: 'Colosseum' })}
      />,
    )
    expect(screen.getByText('Your stay to Colosseum')).toBeInTheDocument()
    expect(screen.getAllByTestId('connection')).toHaveLength(2)
  })

  it('asks the provider once per journey, in one batched request', async () => {
    const sent: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        sent.push(String(init.body))
        return { ok: true, json: async () => ({ legs: {} }) } as Response
      }),
    )
    render(
      <ConnectionsSection
        trip={addItineraryItem(planned(), 0, { placeId: 'p1', name: 'Colosseum' })}
      />,
    )
    // One request, both legs in it — six journeys must not become six round trips.
    await waitFor(() => expect(sent).toHaveLength(1))
    const body = JSON.parse(sent[0]) as { legs: { key: string }[] }
    expect(body.legs).toHaveLength(2)
  })
})
