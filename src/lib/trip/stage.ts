import type { TripState } from './types'
import { hasDestination, tripProgress } from './progress'
import { planConnections } from './connections'
import { FINISH_PROMPT } from '../ui/finish'

/**
 * Where a plan has got to, as one value.
 *
 * The agent used to work this out for itself from a prompt that described the whole journey at once,
 * and the prompt gave conflicting verdicts: "Skopje - Tenerife, 19-28 March, 2 adults" matched a
 * rule saying search now, a rule saying offer a menu, a rule saying ask which flight shape, and a
 * rule saying ask for the origin. Which one won was luck, and the common loser was the traveler —
 * who got a sentence promising flights and no flights.
 *
 * So the app decides the step and the agent executes it. This is a pure function of the trip, which
 * means the next step is the same every time, is testable, and cannot drift from what the plan panel
 * and the suggestion chips believe.
 */
export type PlanStage =
  | 'destination'
  | 'dates'
  | 'origin'
  | 'transport'
  | 'stay'
  | 'activities'
  | 'connections'
  | 'complete'

/**
 * The three tools that can end a turn with nothing on screen.
 *
 * Every other tool either records something or puts options in front of the traveler. These three
 * hand the turn back with a question, which is the right move at a genuine fork and a stall
 * everywhere else — so which of them exists is decided per stage rather than left to judgement.
 */
export type AskTool = 'presentOptions' | 'askTripDetail' | 'askPreferences'

export const ASK_TOOLS: readonly AskTool[] = [
  'presentOptions',
  'askTripDetail',
  'askPreferences',
]

/** Parts of a trip the traveler can settle by handling themselves rather than by choosing. */
export type SkippablePart = 'transport' | 'stay' | 'activities'

export interface StagePlan {
  stage: PlanStage
  /** The job of this turn, addressed to the model. */
  goal: string
  /** Which turn-ending questions are legitimate here. Empty means: deliver something. */
  askTools: AskTool[]
  /** Chips for this moment, used when the agent writes none of its own. */
  replies: string[]
  /** Triperco's own voice, for when the turn delivered nothing at all. */
  nudge: string
  /**
   * Whether this stage's job is to put options on screen. Drives the turn contract: a delivery
   * stage that rendered nothing has failed, whatever its prose claimed.
   */
  delivers: boolean
}

const MAX_REPLIES = 4

function skipped(trip: TripState, part: SkippablePart): boolean {
  return trip.meta.skipped?.includes(part) ?? false
}

/**
 * Whether the whole journey is covered — both legs of a return trip, not just the way out.
 *
 * Borrowed from `tripProgress` rather than counted here, so the stage and the plan panel's own
 * checklist can never disagree about whether somebody still needs a flight home.
 */
function transportSettled(trip: TripState): boolean {
  if (skipped(trip, 'transport')) return true
  return tripProgress(trip).steps.find((step) => step.key === 'transport')?.done ?? false
}

function staySettled(trip: TripState): boolean {
  if (skipped(trip, 'stay')) return true
  return tripProgress(trip).steps.find((step) => step.key === 'stay')?.done ?? false
}

function activitiesSettled(trip: TripState): boolean {
  return trip.days.some((day) => day.items.length > 0) || skipped(trip, 'activities')
}

/**
 * Which stage the plan is on. Ordered, first match wins.
 *
 * "Settled" deliberately means *in the plan or explicitly skipped*, never merely discussed. Someone
 * driving to the coast or staying with family has settled their transport and their bed as surely as
 * someone who booked them, and without that the plan would stall forever on a step they had already
 * dealt with.
 */
export function planStageName(trip: TripState): PlanStage {
  const { meta } = trip
  if (!hasDestination(trip)) return 'destination'
  if (!meta.startDate || !meta.endDate) return 'dates'
  // A flight already in the plan answers where they set off from as surely as recording it did, so
  // a half-finished journey asks for the way home rather than re-asking a settled question.
  if (!transportSettled(trip)) {
    return meta.origin || trip.flights.length > 0 ? 'transport' : 'origin'
  }
  if (!staySettled(trip)) return 'stay'
  if (!activitiesSettled(trip)) return 'activities'
  // Set by getTransferOptions itself when it runs, so reaching the end never depends on the agent
  // remembering to record that it did.
  if (!meta.transfersReviewed && planConnections(trip).length > 0) return 'connections'
  return 'complete'
}

/** The trip's own words for where it is going, for prose that names it. */
function where(trip: TripState): string {
  return trip.meta.destination ?? 'there'
}

function describe(stage: PlanStage, trip: TripState): Omit<StagePlan, 'stage'> {
  const there = where(trip)

  switch (stage) {
    case 'destination':
      return {
        goal:
          'You do not know where they are going yet. Settle that first: the moment you can tell, ' +
          'call setTripMeta with the destination and a short evocative title, then keep going.',
        askTools: ['presentOptions', 'askTripDetail', 'askPreferences'],
        replies: ['Somewhere warm and cheap', 'A weekend city break', 'Surprise me with an idea'],
        nudge: 'Tell me roughly where you fancy going and I will take it from there.',
        delivers: false,
      }

    case 'dates':
      return {
        goal:
          `They are going to ${there}. You need the dates, and nothing else this turn. Ask with ` +
          'askTripDetail "dates" — it opens a calendar, which is how somebody who has not decided ' +
          'yet actually decides.',
        askTools: ['askTripDetail'],
        replies: [`When is ${there} best?`, "I'm flexible on dates", 'Plan 5 days there'],
        nudge: `When were you thinking of going to ${there}?`,
        delivers: false,
      }

    case 'origin':
      return {
        goal:
          'You have the destination and the dates. The one thing you cannot guess is where they ' +
          'set off from. Ask with askTripDetail "origin", and nothing else this turn.',
        askTools: ['askTripDetail'],
        replies: ['I have my own transport', 'Find me somewhere to stay first'],
        nudge: 'Which airport are you flying from?',
        delivers: false,
      }

    case 'transport': {
      // Half a journey is its own moment: they picked a one-way out and still have no way back.
      const halfDone = trip.flights.length > 0
      return {
        goal: halfDone
          ? 'They have chosen the way out and have no way home. Search the return leg now — swap ' +
            'the airports, use the trip end date, and pass direction "return". Do not ask anything.'
          : `Search the flights to ${there} now. Origin, dates and party are all recorded, so there ` +
            'is nothing left to ask and no reason to offer a menu — you have no tool for either. ' +
            'Search, then say what came back in one sentence. Round trip when the dates are a range; ' +
            'one-ways only if they asked for them.',
        askTools: [],
        replies: halfDone
          ? ['Find the flight home', 'Leave later on the way back', 'Only nonstop']
          : [
              'Only nonstop',
              'Cheaper if I shift a day',
              'Show me one-ways',
              "Skip flights — I'm driving",
            ],
        nudge: halfDone
          ? 'I did not get the flight home up. Want me to try again?'
          : `I did not get those flights up. Want me to search ${there} again?`,
        delivers: true,
      }
    }

    case 'stay':
      return {
        goal:
          `Getting there is settled. Find somewhere to stay in ${there} for the trip dates: search, ` +
          'call getStayDetails on the one you would recommend, and name the real trade-off from ' +
          'what reviewers actually said. Do not ask anything first — you have no tool for it.',
        askTools: [],
        replies: ['Somewhere quieter', 'Closer to the centre', 'Only with a kitchen', 'Cheaper'],
        nudge: `I did not get the ${there} stays up. Want me to look again?`,
        delivers: true,
      }

    case 'activities':
      return {
        goal:
          `They have a way there and a bed. Now find things to do in ${there} — one kind this turn, ` +
          'not four: the sights, or somewhere to eat, or tours, or what is on while they are there. ' +
          'Pick the one that fits the vibe on the trip and search it.',
        askTools: [],
        replies: [
          'More like this',
          'Somewhere to eat',
          "What's on while we're there",
          'Something for a rainy day',
        ],
        nudge: `I did not get those up. Want me to look for things to do in ${there}?`,
        delivers: true,
      }

    case 'connections':
      return {
        goal:
          'The plan has a way there, a bed and things to do. What it does not have is how they get ' +
          'between them — the part people discover too late. Call getTransferOptions for the ' +
          'airport run and for the stay to what they picked, and answer with the real numbers.',
        askTools: [],
        replies: ['How do I get from the airport?', 'Is it walkable?', 'What about a taxi?'],
        nudge: 'I could not get the transfer times. Want me to try again?',
        delivers: true,
      }

    case 'complete':
      return {
        goal:
          'Everything a trip needs is covered, and the app has already told them so. Follow their ' +
          'lead now: tighten what they have, make it cheaper, put it in a sensible order. If they ' +
          'say they are done, do not write the summary yourself — the app hands them the finished ' +
          `trip and its link when they ask for it. Say something like "${FINISH_PROMPT}" is how.`,
        askTools: ['presentOptions', 'askTripDetail', 'askPreferences'],
        replies: ['Make it cheaper', 'Plan it day by day', 'Add a hidden gem', FINISH_PROMPT],
        nudge: 'What would you like to change?',
        delivers: false,
      }
  }
}

/** The whole plan for this turn: which step, what it is for, and what is allowed. */
export function planStage(trip: TripState): StagePlan {
  const stage = planStageName(trip)
  const described = describe(stage, trip)
  return { stage, ...described, replies: described.replies.slice(0, MAX_REPLIES) }
}

/**
 * The stage block the agent reads, naming this turn's job.
 *
 * The traveler's own words are stated to beat it, because the stage is a default for silence rather
 * than a cage: somebody who asks about restaurants while the plan is short of a hotel should get
 * restaurants.
 */
export function formatStagePlan(plan: StagePlan): string {
  return [
    'THIS TURN',
    plan.goal,
    '',
    'If they asked for something else, do that instead — their words beat this. Otherwise this is ' +
      'the job, and you have the tools for it and no others.',
  ].join('\n')
}

/**
 * A short first-person line for the traveler's side of the thread when the plan moves on by itself.
 *
 * Deliberately something they could have typed: the advance is real (they just added something), so
 * a visible message keeps the transcript honest rather than hiding a turn they did not send.
 * Null where an advance needs no prompting — nothing has been settled yet.
 */
export function stageAdvancePrompt(stage: PlanStage): string | null {
  switch (stage) {
    case 'stay':
      return "Added the flights — where should we stay?"
    case 'activities':
      return "That's the stay sorted — what's worth doing?"
    case 'connections':
      return 'How do I get between all of these?'
    default:
      /*
       * destination, dates, origin and transport are reached by talking, not by adding.
       *
       * `complete` is silent for a different reason. Reaching the end is a fact about the plan, not
       * a question for the concierge, and asking one produced exactly the wrong turn: a model that
       * had just been told everything was covered would go looking for something else to offer,
       * and the traveler never heard that they were finished. The app says so itself, and offers
       * finishing as one of the choices — see `PlanDoneCard`.
       */
      return null
  }
}
