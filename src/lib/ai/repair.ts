import { generateText, type ModelMessage } from 'ai'
import { plannerModel } from './model'
import { REPAIR_INSTRUCTION, usableProse } from './turnQuality'

/** Injectable so tests never reach a provider. Mirrors `SearchDeps` in the search layer. */
export interface RepairDeps {
  generate?: (messages: ModelMessage[]) => Promise<string>
}

async function callModel(messages: ModelMessage[]): Promise<string> {
  const { text } = await generateText({
    model: plannerModel(),
    system: REPAIR_INSTRUCTION,
    messages,
  })
  return text ?? ''
}

/**
 * One more attempt at a sentence, after a turn came back with nothing a traveler could read.
 *
 * Deliberately toolless. The searches for this turn already ran and their cards are already on
 * screen; a repair that ran them again would bill the provider twice and could contradict what the
 * traveler is looking at. All this needs to produce is the missing sentence.
 *
 * Returns null rather than throwing: a repair that fails is not news the traveler needs, and the
 * caller has a kinder line ready.
 */
export async function repairReply(
  messages: ModelMessage[],
  deps?: RepairDeps,
): Promise<string | null> {
  try {
    const text = await (deps?.generate ?? callModel)(messages)
    const prose = usableProse(text)
    return prose.length > 0 ? prose : null
  } catch {
    return null
  }
}
