import type { OptionSet } from './interactions'

/**
 * Ending the planning, as something the traveler can ask for.
 *
 * A planning chat has no natural last turn. Everything is covered, the agent keeps politely offering
 * to tighten it, and the traveler is left wondering whether they are finished or whether something is
 * still owed. So finishing is an explicit move with an explicit answer: the trip, said back to them
 * step by step, with the link to take away.
 *
 * The recap is built by the app rather than asked of the model — see `tripRecap`. What lives here is
 * only the question of whether the traveler just asked for it.
 */

/** The words on the button, and what gets sent when it is pressed. */
export const FINISH_PROMPT = "That's everything — summarise my trip"

/** What that button says. */
export const FINISH_LABEL = 'Finish and summarise the trip'

/**
 * Phrasings that mean "I am done planning".
 *
 * Deliberately a short, closed list of ways of *asking to stop*, and it is written to be dull rather
 * than clever. Every match here silently replaces a turn the model would otherwise have taken, so a
 * false positive is worse than a miss: "what else is worth doing?" must reach the concierge, and a
 * miss only costs one more tap on a chip that is always on screen at this point.
 */
const FINISH_PATTERNS: RegExp[] = [
  /^that'?s everything\b/i,
  /\b(summari[sz]e|recap) (my|the|this) trip\b/i,
  /\b(show|give) me (the|my) (trip )?summary\b/i,
  /\bwrap (it|this|things) up\b/i,
  /\b(finish|end|done with) (the |my )?planning\b/i,
  /\bi'?m done planning\b/i,
]

/** Whether this message is the traveler asking to stop planning and be handed the trip. */
export function isFinishRequest(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  return FINISH_PATTERNS.some((pattern) => pattern.test(trimmed))
}

/**
 * What the traveler is told the moment their trip is actually covered.
 *
 * Said by the app rather than asked of the model, because "is this trip complete?" already has an
 * exact answer in `planStageName` — and a model asked to judge it would sometimes go looking for
 * something else to offer instead, which is precisely how a finished plan never got announced.
 */
export const PLAN_DONE_TEXT =
  'That is your trip covered — a way there, somewhere to stay, and things to do.'

/** The choices offered alongside it: three ways to keep going, and one way to stop. */
export function planDoneOptions(destination?: string): OptionSet {
  const there = destination ?? 'there'
  return {
    question: 'Anything you want to change, or shall I wrap it up?',
    options: [
      { label: 'Make it cheaper', prompt: 'Can we make this trip cheaper?' },
      { label: 'Plan it day by day', prompt: 'Plan it out day by day' },
      { label: 'Add a hidden gem', prompt: `Add a hidden gem in ${there} I would not have found` },
      { label: FINISH_LABEL, prompt: FINISH_PROMPT },
    ],
  }
}
