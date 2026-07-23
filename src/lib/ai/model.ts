import { google } from '@ai-sdk/google'

/**
 * The planner's language model. Single swap point: to move to Claude Sonnet,
 * replace the import with `@ai-sdk/anthropic` and return `anthropic(id)`.
 * Reads GEMINI_MODEL (default gemini-2.5-flash); needs GOOGLE_GENERATIVE_AI_API_KEY at call time.
 * Return type is inferred (the concrete provider model) so `.modelId` is accessible;
 * it remains assignable to the AI SDK `LanguageModel` type where consumed.
 */
export function plannerModel() {
  const id = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  return google(id)
}
