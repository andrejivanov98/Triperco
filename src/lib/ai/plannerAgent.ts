import { ToolLoopAgent, type LanguageModel } from 'ai'
import type { TripState } from '../trip/types'
import type { SearchDeps } from '../searchapi/search'
import type { ContextHint } from '../ui/contextHints'
import { buildSystemPrompt } from './systemPrompt'
import { buildPlannerTools, createPlannerState, type PlannerState } from './tools'
import { plannerModel } from './model'

export interface CreatePlannerAgentOptions {
  trip?: TripState
  deps?: SearchDeps
  model?: LanguageModel
  /** What the traveler could see when they sent the message. */
  hints?: ContextHint[]
}

/**
 * Builds a planner agent plus the mutable PlannerState its tools operate on.
 * The default ~20-step tool loop (AI SDK default) is plenty for a planning turn.
 */
export function createPlannerAgent(opts: CreatePlannerAgentOptions = {}) {
  const state = createPlannerState(opts.trip)
  const agent = new ToolLoopAgent({
    model: opts.model ?? plannerModel(),
    instructions: buildSystemPrompt(new Date(), opts.hints ?? []),
    tools: buildPlannerTools(state, opts.deps),
  })
  return { agent, state }
}

export type { PlannerState }
