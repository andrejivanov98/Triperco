export type SearchParams = Record<string, string | number | undefined>

export interface SearchApiOptions {
  apiKey?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  baseUrl?: string
}

const DEFAULT_BASE_URL = 'https://www.searchapi.io/api/v1/search'

/** Plenty for a lookup that hits a cache or a small index. */
const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Flight search is genuinely slow — a long-haul round trip regularly takes more than 15 seconds at
 * the provider, and cutting it off there returned "no flights" for routes that have plenty. The
 * traveler saw an empty result where Google Flights showed dozens.
 */
const ENGINE_TIMEOUT_MS: Record<string, number> = {
  google_flights: 45_000,
}

/** Long enough for a blip to pass, short enough to stay inside the request budget. */
const RETRY_DELAY_MS = 250

/** How many extra attempts a retryable failure gets. One: past that we are just burning quota. */
const MAX_RETRIES = 1

/**
 * A provider failure, carrying whether trying again could plausibly help.
 *
 * The distinction matters in two directions: a 4xx repeated is quota spent to be told the same
 * thing, and a rate limit retried immediately is the one case where trying again is actively worse.
 */
class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

/** The `error` field of a failed response, when the body is readable JSON. */
async function providerError(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : undefined
  } catch {
    return undefined
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** One attempt. Throws a ProviderError that says whether a second one is worth making. */
async function attempt<T>(
  url: string,
  apiKey: string,
  engine: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let res: Response
    try {
      res = await fetchImpl(url, {
        // The key travels as a header, never in the URL, where it would reach access logs.
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      })
    } catch (err) {
      /*
       * Our own timeout fired. Not retryable: the flight engine's timeout is already most of the
       * request budget, so a second attempt would blow through it and the traveler would wait twice
       * as long for the same nothing.
       */
      if (controller.signal.aborted) {
        throw new ProviderError(`SearchApi ${engine} timed out after ${timeoutMs}ms`, false)
      }
      const reason = err instanceof Error ? err.message : String(err)
      throw new ProviderError(`SearchApi ${engine} could not be reached: ${reason}`, true)
    }

    if (!res.ok) {
      // Pass the provider's reason through — the agent uses it to correct its own parameters.
      const reason = await providerError(res)
      const suffix = reason ? ` — ${reason}` : ''
      if (res.status === 429) {
        throw new ProviderError(
          `SearchApi ${engine} hit a rate limit: 429${suffix}. Too many requests — wait before searching again rather than retrying now.`,
          false,
        )
      }
      throw new ProviderError(
        `SearchApi ${engine} request failed: ${res.status}${suffix}`,
        // 5xx is the provider having a bad moment; 4xx is us asking for the wrong thing.
        res.status >= 500,
      )
    }

    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchApi<T>(
  engine: string,
  params: SearchParams,
  opts: SearchApiOptions = {},
): Promise<T> {
  const apiKey = opts.apiKey ?? process.env.SEARCHAPI_API_KEY
  if (!apiKey) {
    throw new Error('SEARCHAPI_API_KEY is not set')
  }

  const fetchImpl = opts.fetchImpl ?? fetch
  const url = new URL(opts.baseUrl ?? DEFAULT_BASE_URL)
  url.searchParams.set('engine', engine)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  const target = url.toString()
  const timeoutMs = opts.timeoutMs ?? ENGINE_TIMEOUT_MS[engine] ?? DEFAULT_TIMEOUT_MS

  /*
   * One transient failure should not cost the traveler a whole search. Before this, a single 5xx or
   * dropped socket returned "no flights" for a route with plenty.
   */
  for (let tries = 0; ; tries++) {
    try {
      return await attempt<T>(target, apiKey, engine, timeoutMs, fetchImpl)
    } catch (err) {
      const retryable = err instanceof ProviderError && err.retryable
      if (!retryable || tries >= MAX_RETRIES) throw err
      await delay(RETRY_DELAY_MS)
    }
  }
}
