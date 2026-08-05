import { describe, it, expect } from 'vitest'
import type { ModelMessage } from 'ai'
import { repairReply } from './repair'

const messages: ModelMessage[] = [{ role: 'user', content: 'Find me a hotel in Rome' }]

describe('repairReply', () => {
  it('returns the recovered sentence', async () => {
    const generate = async () => '14 stays in Trastevere — the first is the best value.'
    expect(await repairReply(messages, { generate })).toBe(
      '14 stays in Trastevere — the first is the best value.',
    )
  })

  it('strips code out of the repair, so a second failure cannot leak through', async () => {
    const generate = async () => '```json\n{"a":1}\n```\nHere are 12 stays.'
    expect(await repairReply(messages, { generate })).toBe('Here are 12 stays.')
  })

  it('returns null when the repair is itself unreadable', async () => {
    const generate = async () => '```json\n{"a":1}\n```'
    expect(await repairReply(messages, { generate })).toBeNull()
  })

  it('returns null when the repair produced nothing', async () => {
    expect(await repairReply(messages, { generate: async () => '' })).toBeNull()
    expect(await repairReply(messages, { generate: async () => '   ' })).toBeNull()
  })

  it('swallows a thrown provider error — the caller has a kinder line', async () => {
    const generate = async () => {
      throw new Error('503 upstream unavailable')
    }
    await expect(repairReply(messages, { generate })).resolves.toBeNull()
  })

  it('passes the conversation through to the model', async () => {
    let seen: ModelMessage[] | undefined
    await repairReply(messages, {
      generate: async (m) => {
        seen = m
        return 'ok'
      },
    })
    expect(seen).toEqual(messages)
  })
})
