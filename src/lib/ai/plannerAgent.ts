import { ToolLoopAgent, type LanguageModel } from 'ai'
import type { TripState } from '../trip/types'
import type { SearchDeps } from '../searchapi/search'
import type { ContextHint } from '../ui/contextHints'
import { planStage, ASK_TOOLS, type StagePlan } from '../trip/stage'
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
 * Which tools exist this turn.
 *
 * Only the three that can end a turn with nothing on screen are ever withheld. Every search stays
 * available at every stage, so a traveler who asks about restaurants midway through choosing
 * flights still gets restaurants — the stage is a default for silence, not a cage. What they cannot
 * get is a menu of alternatives offered instead of the thing they already asked for, because at a
 * delivery stage the model has no tool that does that.
 */
export function activeToolNames<T extends string>(all: readonly T[], stage: StagePlan): T[] {
  const withheld = new Set<string>(ASK_TOOLS.filter((name) => !stage.askTools.includes(name)))
  return all.filter((name) => !withheld.has(name))
}

/**
 * Builds a planner agent plus the mutable PlannerState its tools operate on.
 * The default ~20-step tool loop (AI SDK default) is plenty for a planning turn.
 */
export function createPlannerAgent(opts: CreatePlannerAgentOptions = {}) {
  const state = createPlannerState(opts.trip)
  const stage = planStage(state.trip)
  const tools = buildPlannerTools(state, opts.deps)
  const activeTools = activeToolNames(Object.keys(tools) as (keyof typeof tools)[], stage)

  const agent = new ToolLoopAgent({
    model: opts.model ?? plannerModel(),
    instructions: buildSystemPrompt(
      new Date(),
      opts.hints ?? [],
      stage,
      state.trip.meta.destination,
    ),
    tools,
    activeTools,
  })
  return { agent, state, stage }
}

export type { PlannerState, StagePlan }
