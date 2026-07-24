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
