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

  it('says so plainly when no times came back, rather than inventing one', async () => {
    stubTransfers({ 'arrive:f1:s1': [] })
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/no times came back/i)).toBeInTheDocument())
  })

  it('always offers a way to check the route itself', () => {
    stubTransfers({})
    render(<ConnectionsSection trip={planned()} />)
    const link = screen.getByRole('link', { name: /directions/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('google.com/maps/dir'))
    expect(link).toHaveAttribute('href', expect.stringContaining('FCO+airport'))
  })

  /**
   * A request that never landed says nothing about whether the journey has a route, so it must not
   * be reported as one that has none. That claim is exactly what sent travelers to Google Maps to
   * find the four options we had just told them did not exist.
   */
  it('admits it could not check, rather than claiming there is no route', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/could not check/i)).toBeInTheDocument())
    expect(screen.queryByText(/no times came back/i)).not.toBeInTheDocument()
    // The leg is still named and still linkable, which is the part that matters.
    expect(screen.getByText('Airport to your stay')).toBeInTheDocument()
  })

  it('says the same when the request is refused rather than dropped', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }) as Response),
    )
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/could not check/i)).toBeInTheDocument())
  })

  /**
   * The step the traveler was doing by hand.
   *
   * Told there were no times, they opened Maps — and Maps asked arrivals or departures, then which
   * terminal, then which mode, before showing a single number. Each of these opens the journey with
   * the mode already chosen, so what is left is one tap.
   */
  it('offers each way of covering the ground when no times came back', async () => {
    stubTransfers({ 'arrive:f1:s1': [] })
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/no times came back/i)).toBeInTheDocument())

    for (const [label, mode] of [
      ['Drive', 'driving'],
      ['Transit', 'transit'],
      ['Walk', 'walking'],
    ]) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        expect.stringContaining(`travelmode=${mode}`),
      )
    }
  })

  it('offers them when the check itself failed too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/could not check/i)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Transit' })).toBeInTheDocument()
  })

  it('offers nothing extra on a journey that answered', async () => {
    stubTransfers({ 'arrive:f1:s1': [{ mode: 'Driving', duration: '27 min', durationSeconds: 1612 }] })
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/27 min/)).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: 'Transit' })).not.toBeInTheDocument()
  })

  /*
   * The description that finally routed is usually a pair of coordinates rather than the airport name
   * the plan shows — and coordinates are what skip the terminal picker. So the link must open the
   * journey that worked, not the name that did not.
   */
  it('opens the journey that actually routed, not the name that failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              legs: { 'arrive:f1:s1': [] },
              endpoints: { 'arrive:f1:s1': { from: '41.8,12.25', to: '41.9,12.49' } },
            }),
          }) as Response,
      ),
    )
    render(<ConnectionsSection trip={planned()} />)
    await waitFor(() => expect(screen.getByText(/no times came back/i)).toBeInTheDocument())

    const link = screen.getByRole('link', { name: /directions/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('41.8%2C12.25'))
    expect(link).toHaveAttribute('href', expect.stringContaining('41.9%2C12.49'))
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

  /**
   * The server prices eight legs per request and drops the rest. The client used to send everything
   * in one go and then record an empty answer for every key it had asked about — so a plan with nine
   * journeys reported "no route" for the ninth every single time, whatever Maps would have said.
   */
  it('never asks about more journeys than one request can price', async () => {
    const sent: { legs: { key: string }[] }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        sent.push(JSON.parse(String(init.body)))
        return { ok: true, json: async () => ({ legs: {} }) } as Response
      }),
    )

    let trip = planned()
    for (let i = 0; i < 9; i++) {
      trip = addItineraryItem(trip, 0, { placeId: `p${i}`, name: `Place ${i}` })
    }
    render(<ConnectionsSection trip={trip} />)

    // Ten journeys: the airport run plus nine visits. Two requests, and every key in one of them.
    await waitFor(() => expect(sent).toHaveLength(2))
    for (const request of sent) expect(request.legs.length).toBeLessThanOrEqual(8)
    const asked = sent.flatMap((r) => r.legs.map((l) => l.key))
    expect(asked).toHaveLength(10)
  })

  it('sends other ways of naming each end, so one bad name is not the final answer', async () => {
    const sent: { legs: Record<string, unknown>[] }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        sent.push(JSON.parse(String(init.body)))
        return { ok: true, json: async () => ({ legs: {} }) } as Response
      }),
    )
    render(<ConnectionsSection trip={planned()} />)

    await waitFor(() => expect(sent).toHaveLength(1))
    const leg = sent[0].legs[0]
    expect(leg.to).toBe('Hotel Artemide, Rome')
    expect(leg.toAlternates).toContain('Via Nazionale 22, Rome')
  })
})
