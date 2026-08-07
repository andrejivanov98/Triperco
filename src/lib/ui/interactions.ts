import type { TriperUIMessage } from './messages'

export interface OptionChoice {
  label: string
  prompt: string
}

/** A guided menu the assistant presents; choosing sends the choice's `prompt`. */
export interface OptionSet {
  question?: string
  options: OptionChoice[]
}

/** A preference micro-form; submitting sends the selection(s) as a message. */
export interface PrefForm {
  question: string
  mode: 'single' | 'multi'
  options: string[]
  /**
   * Which part of the trip brief this form closes, when it is one of ours rather than a question the
   * agent invented. Set, the client applies the answer to the trip itself instead of waiting for the
   * model to record it — so forgetting to call setTripMeta cannot make the same form come back.
   */
  intent?: 'interests'
}

/**
 * A concrete trip detail the agent needs, answered with a real control rather than typed prose.
 *
 * Asking "when are you thinking of going?" in a chat bubble makes a traveler compose a sentence to
 * answer something a calendar answers better — and someone who has not decided yet has nothing to
 * type at all. This is a planning app; the controls are the point.
 */
export type DetailField = 'destination' | 'dates' | 'party' | 'origin' | 'budget'

export interface DetailRequest {
  field: DetailField
  question: string
}

/** Follow-ups the agent proposes for this exact moment in the conversation. */
export interface ReplySuggestions {
  replies: string[]
}

/**
 * The finished trip, said back step by step, with the link to take away.
 *
 * Written by the app from the plan itself and never by the model. This is the turn where the
 * traveler stops planning and starts trusting the answer, so a recap carrying an invented price or a
 * flight nobody chose would be worse than no recap at all — and prose is exactly where that happens.
 */
export interface TripRecapCard {
  title: string
  /** Where, when, how many. */
  subtitle: string
  /** The trip in travel order, one step per line. */
  steps: string[]
  total?: string
  /** The shareable trip summary. Absent when the trip could not be saved. */
  url?: string
}

/**
 * A line Triperco writes itself, when the model's own answer could not be shown.
 *
 * Kept separate from assistant text on purpose: this is never the model's voice, so it can never be
 * mistaken for trip information, and it can never carry a price or a claim.
 */
export interface TurnNotice {
  text: string
  /** `recovered` — a second attempt produced this. `failed` — nothing could be produced at all. */
  kind: 'recovered' | 'failed'
}

export function getSuggestions(message: TriperUIMessage): string[] {
  return message.parts
    .filter((p): p is { type: 'data-suggestions'; data: ReplySuggestions } => p.type === 'data-suggestions')
    .flatMap((p) => p.data.replies)
}

export function getOptionSets(message: TriperUIMessage): OptionSet[] {
  return message.parts
    .filter((p): p is { type: 'data-options'; data: OptionSet } => p.type === 'data-options')
    .map((p) => p.data)
}

export function getForms(message: TriperUIMessage): PrefForm[] {
  return message.parts
    .filter((p): p is { type: 'data-form'; data: PrefForm } => p.type === 'data-form')
    .map((p) => p.data)
}

export function getDetailRequests(message: TriperUIMessage): DetailRequest[] {
  return message.parts
    .filter((p): p is { type: 'data-detail'; data: DetailRequest } => p.type === 'data-detail')
    .map((p) => p.data)
}

export function getRecaps(message: TriperUIMessage): TripRecapCard[] {
  return message.parts
    .filter((p): p is { type: 'data-recap'; data: TripRecapCard } => p.type === 'data-recap')
    .map((p) => p.data)
}

export function getNotices(message: TriperUIMessage): TurnNotice[] {
  return message.parts
    .filter((p): p is { type: 'data-notice'; data: TurnNotice } => p.type === 'data-notice')
    .map((p) => p.data)
}
