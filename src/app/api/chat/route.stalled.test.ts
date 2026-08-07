import { describe, it, expect, vi, beforeEach } from 'vitest'
import { planStage } from '@/lib/trip/stage'
import { createTrip, setMeta } from '@/lib/trip/tripState'
import { createPlannerState } from '@/lib/ai/tools'

/**
 * The failure that started all of this, at the seam where it reaches the traveler.
 *
 * The turn said "Alright, I'll look into flights from Skopje to Tenerife for those dates for two
 * adults" and searched nothing. It threw nothing, so no error handler saw it; it produced readable
 * prose, so the empty-bubble check passed it. The traveler got a promise and an empty screen.
 */

/** What the model wrote this turn, and whether its tools put anything on screen. */
let turn: { text: string; searched: boolean } = { text: '', searched: false }

const trip = setMeta(createTrip('t'), {
  destination: 'Tenerife',
  origin: 'SKP',
  startDate: '2027-03-19',
  endDate: '2027-03-28',
  travelers: 2,
})

const repairReply = vi.fn(async () => 'A plain sentence.')

vi.mock('@/lib/rate/limit', () => ({
  checkRateLimit: async () => ({ ok: true }),
  tooManyRequests: () => new Response('slow down', { status: 429 }),
}))
vi.mock('@/lib/ai/repair', () => ({ repairReply: (...args: unknown[]) => repairReply(...(args as [])) }))
vi.mock('@/lib/ai/plannerAgent', () => ({
  createPlannerAgent: () => {
    const state = createPlannerState(trip)
    if (turn.searched) {
      state.pendingResults.push({
        kind: 'flights',
        query: 'SKP → TFS',
        items: [],
        flightType: 'one_way',
      })
    }
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
        messages: [{ id: 'm', role: 'user', parts: [{ type: 'text', text: 'Skopje - Tenerife' }] }],
        trip,
      }),
    }),
  )
  return await new Response(res.body).text()
}

describe('POST /api/chat — a turn that talked and did nothing', () => {
  beforeEach(() => {
    repairReply.mockClear()
    turn = { text: '', searched: false }
  })

  it('answers in Triperco’s own voice when a search stage rendered nothing', async () => {
    turn = { text: "Alright, I'll look into flights from Skopje to Tenerife for those dates.", searched: false }
    const body = await send()

    expect(body).toContain('data-notice')
    // The stage's own words, naming the thing that did not happen.
    expect(body).toContain(planStage(trip).nudge)
  })

  it('offers the chips that get the search moving', async () => {
    turn = { text: "I'll look into flights.", searched: false }
    const body = await send()
    for (const reply of planStage(trip).replies) {
      expect(body).toContain(reply)
    }
  })

  /*
   * Deliberately no repair call. A repair re-runs the turn, and the searches it already paid for
   * would be billed a second time — while the model has just demonstrated it is not going to run
   * the one that mattered.
   */
  it('does not pay for a second model call to fix it', async () => {
    turn = { text: "I'll look into flights.", searched: false }
    await send()
    expect(repairReply).not.toHaveBeenCalled()
  })

  it('says nothing extra when the turn actually delivered', async () => {
    turn = { text: 'Cheapest is 180 euro, but it lands at midnight.', searched: true }
    expect(await send()).not.toContain('data-notice')
  })

  /** Cards alone are a complete answer — plenty of good turns are wordless. */
  it('accepts a wordless turn that put flights on screen', async () => {
    turn = { text: '', searched: true }
    expect(await send()).not.toContain('data-notice')
  })
})
