import { describe, it, expect, vi, beforeEach } from 'vitest'
import { planStage } from '@/lib/trip/stage'
import { createTrip, setMeta, addFlight, addStay, addItineraryItem } from '@/lib/trip/tripState'
import { createPlannerState } from '@/lib/ai/tools'
import type { TripMeta, TripState } from '@/lib/trip/types'

/**
 * The brief, made a guarantee rather than a hope.
 *
 * The stage tells the model to ask with a control — a calendar for the dates, steppers for the party,
 * the trip-type options for what they are after — and it has the tool for exactly that. When it asks
 * in prose anyway, or asks nothing at all, this is what puts the control on screen: no second model
 * call, because asking again for a sentence is what produced the prose question in the first place.
 */

/**
 * What the model wrote this turn, whether it actually asked with a control, and whether its tools
 * moved the plan on — a `setTripMeta` call is a real thing a turn can do instead of asking.
 */
let turn: { text: string; asked: boolean; records?: Partial<TripMeta> } = { text: '', asked: false }
/** The trip the turn runs against, which decides the stage and therefore what must be asked. */
let trip: TripState = createTrip('t')

const repairReply = vi.fn(async () => 'A plain sentence.')

vi.mock('@/lib/rate/limit', () => ({
  checkRateLimit: async () => ({ ok: true }),
  tooManyRequests: () => new Response('slow down', { status: 429 }),
}))
vi.mock('@/lib/ai/repair', () => ({ repairReply: (...args: unknown[]) => repairReply(...(args as [])) }))
vi.mock('@/lib/ai/plannerAgent', () => ({
  createPlannerAgent: () => {
    const state = createPlannerState(trip)
    if (turn.asked) state.pendingDetails.push({ field: 'dates', question: 'When?' })
    // Applied up front rather than lazily: the tools run before the route reads the state, so this is
    // what a turn that recorded something looks like by the time the contract is judged.
    if (turn.records) state.trip = setMeta(state.trip, turn.records)
    return {
      state,
      stage: planStage(trip),
      agent: {
        stream: async () => ({
          stream: new ReadableStream({ start: (c) => c.close() }),
          text: Promise.resolve(turn.text),
        }),
      },
    }
  },
}))

const { POST } = await import('./route')

async function send(): Promise<string> {
  const res = await POST(
    new Request('https://triperco.test/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [{ id: 'm', role: 'user', parts: [{ type: 'text', text: 'Barcelona please' }] }],
        trip,
      }),
    }),
  )
  return await new Response(res.body).text()
}

/** Destination and dates known, nothing else — the trip is on the party step. */
function needsParty(): TripState {
  return setMeta(createTrip('t'), {
    destination: 'Barcelona',
    startDate: '2027-05-01',
    endDate: '2027-05-05',
  })
}

/** Party known too, so the trip is on the interests step. */
function needsInterests(): TripState {
  return setMeta(needsParty(), { adults: 2, travelers: 2 })
}

describe('POST /api/chat — a brief the model asked for in prose', () => {
  beforeEach(() => {
    repairReply.mockClear()
    turn = { text: '', asked: false }
    trip = needsParty()
  })

  it('sends the steppers when the model asked for the party in words', async () => {
    turn = { text: 'How many of you are going?', asked: false }
    const body = await send()

    expect(body).toContain('data-detail')
    expect(body).toContain('"field":"party"')
  })

  /** Its sentence is usually a perfectly good lead-in to the card, so it is kept. */
  it('keeps the model’s own words beside the control', async () => {
    turn = { text: 'How many of you are going?', asked: false }
    const body = await send()
    expect(body).not.toContain('data-notice')
  })

  it('speaks for itself when the turn said nothing at all', async () => {
    turn = { text: '', asked: false }
    const body = await send()

    expect(body).toContain('data-notice')
    expect(body).toContain(planStage(trip).nudge)
    expect(body).toContain('"field":"party"')
  })

  /*
   * Never a second model call. Asking again for a sentence is exactly what produced the prose
   * question, and a repair here would cost a turn to get the same wrong shape back.
   */
  it('never asks the model again', async () => {
    turn = { text: '', asked: false }
    await send()
    expect(repairReply).not.toHaveBeenCalled()
  })

  it('stays out of the way when the model asked properly', async () => {
    turn = { text: 'Who is coming along?', asked: true }
    const body = await send()

    // One control on screen: the model's own, not ours on top of it.
    expect(body.match(/data-detail/g)).toHaveLength(1)
    expect(body).toContain('"field":"dates"')
  })

  it('sends the trip-type options when the interests were asked for in prose', async () => {
    trip = needsInterests()
    turn = { text: 'What sort of trip do you want?', asked: false }
    const body = await send()

    expect(body).toContain('data-form')
    expect(body).toContain('"intent":"interests"')
    expect(body).toContain('Food and restaurants')
  })

  it('sends the destination card at the very start of a conversation', async () => {
    trip = createTrip('t')
    turn = { text: '', asked: false }
    const body = await send()

    expect(body).toContain('"field":"destination"')
  })

  /*
   * The contract reads the step the plan is on *after* the turn, and this is why.
   *
   * "Skopje - Tenerife" typed as free text starts the turn on the destination step. A model that reads
   * it, records it with setTripMeta and stops has answered the question — and judging the step it
   * started on would hand back a card asking where they are going about a trip that now knows.
   */
  it('does not ask for something the turn just recorded', async () => {
    trip = createTrip('t')
    turn = { text: 'Tenerife it is.', asked: false, records: { destination: 'Tenerife' } }
    const body = await send()

    expect(body).not.toContain('"field":"destination"')
    // The next thing it does need, though — the dates.
    expect(body).toContain('"field":"dates"')
  })
})

/**
 * The other half of judging the settled step: a turn that answered how they get around.
 *
 * `getTransferOptions` renders no cards — it answers in prose with real numbers — so measured against
 * the step it started on, every successful one of those looked like a stall and collected an "I could
 * not get the transfer times" underneath the answer it had just given. The tool that does the work is
 * the same tool that moves the step on, so reading the step afterwards tells them apart.
 */
describe('POST /api/chat — a turn that answered without rendering anything', () => {
  beforeEach(() => {
    turn = { text: '', asked: false }
  })

  function needsConnections(): TripState {
    let t = setMeta(createTrip('t'), {
      destination: 'Barcelona',
      origin: 'SKP',
      startDate: '2027-05-01',
      endDate: '2027-05-05',
      travelers: 2,
      adults: 2,
      vibe: ['culture'],
    })
    t = addFlight(t, { id: 'f1', from: 'SKP', to: 'BCN', stops: 0, price: 120, bookUrl: '' })
    t = addFlight(t, {
      id: 'f2',
      from: 'BCN',
      to: 'SKP',
      stops: 0,
      price: 110,
      bookUrl: '',
      direction: 'return',
    })
    t = addStay(t, {
      id: 's1',
      name: 'Hotel Eixample',
      source: 'hotel',
      pricePerNight: 90,
      nights: 4,
      photos: [],
      bookUrl: '',
    })
    return addItineraryItem(t, 0, { placeId: 'p1', name: 'Sagrada Família' })
  }

  it('takes the answer at its word when the lookup moved the plan on', async () => {
    trip = needsConnections()
    expect(planStage(trip).stage).toBe('connections')
    turn = {
      text: 'The airport is a 25 minute drive, or 40 by metro.',
      asked: false,
      records: { transfersReviewed: true },
    }

    const body = await send()
    expect(body).not.toContain('data-notice')
  })

  it('still says so when the lookup never happened', async () => {
    trip = needsConnections()
    turn = { text: 'It should be pretty close.', asked: false }

    const body = await send()
    expect(body).toContain('data-notice')
    expect(body).toContain(planStage(trip).nudge)
  })
})
