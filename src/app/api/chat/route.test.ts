import { describe, it, expect, vi } from 'vitest'
import { MAX_MESSAGES, MAX_PROMPT_CHARS } from '@/lib/ai/requestLimits'

/**
 * The guard runs before the agent is ever built, so nothing here needs a model — which is the point:
 * an oversized request must cost nothing.
 */
const createPlannerAgent = vi.fn(() => {
  throw new Error('the agent should never be built for a request the guard refuses')
})

vi.mock('@/lib/ai/plannerAgent', () => ({ createPlannerAgent }))
vi.mock('@/lib/rate/limit', () => ({
  checkRateLimit: async () => ({ ok: true }),
  tooManyRequests: () => new Response('slow down', { status: 429 }),
}))

const { POST } = await import('./route')

function post(body: unknown): Promise<Response> {
  return POST(
    new Request('https://triperco.test/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

const text = (body: string) => ({ id: 'm', role: 'user', parts: [{ type: 'text', text: body }] })

describe('POST /api/chat — what it refuses before spending anything', () => {
  it('rejects a malformed body', async () => {
    const res = await POST(
      new Request('https://triperco.test/api/chat', { method: 'POST', body: '{oops' }),
    )
    expect(res.status).toBe(400)
    expect(createPlannerAgent).not.toHaveBeenCalled()
  })

  it('rejects a thread that is not an array', async () => {
    expect((await post({ messages: 'hello' })).status).toBe(400)
    expect((await post({})).status).toBe(400)
    expect(createPlannerAgent).not.toHaveBeenCalled()
  })

  /**
   * Every character is billed as input on every turn, so this is the ceiling that stops one scripted
   * request costing more than a hundred real planning sessions.
   */
  it('refuses a thread carrying more text than the model should be asked to read', async () => {
    const res = await post({ messages: [text('x'.repeat(MAX_PROMPT_CHARS + 1))] })
    expect(res.status).toBe(413)
    expect(createPlannerAgent).not.toHaveBeenCalled()
  })

  it('refuses more turns than a real session has', async () => {
    const res = await post({ messages: Array.from({ length: MAX_MESSAGES + 1 }, () => text('hi')) })
    expect(res.status).toBe(413)
  })

  it('refuses a file part, whose url the provider would fetch on our budget', async () => {
    const res = await post({
      messages: [
        { id: 'm', role: 'user', parts: [{ type: 'file', mediaType: 'image/png', url: 'https://elsewhere.test/x' }] },
      ],
    })
    expect(res.status).toBe(400)
    expect(createPlannerAgent).not.toHaveBeenCalled()
  })

  it('says why, without naming anything internal', async () => {
    const body = (await (await post({ messages: [text('x'.repeat(MAX_PROMPT_CHARS + 1))] })).json()) as {
      error: string
    }
    expect(body.error).toBe('That conversation is too large to continue. Start a new chat.')
  })

  /** Result cards are echoed back with every turn and never reach the model, so they cost nothing. */
  it('lets a thread through when the bulk of it is result data rather than text', async () => {
    createPlannerAgent.mockImplementationOnce(() => {
      throw new Error('reached the agent')
    })
    const heavy = {
      id: 'a',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'four stays' },
        { type: 'data-results', data: { blob: 'x'.repeat(MAX_PROMPT_CHARS * 2) } },
      ],
    }
    // The guard passes it on, so the agent is built — which is as far as this test needs to get.
    await post({ messages: [heavy] }).catch(() => undefined)
    expect(createPlannerAgent).toHaveBeenCalled()
  })
})
