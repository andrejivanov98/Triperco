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

/** The `error` field of a failed response, when the body is readable JSON. */
async function providerError(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : undefined
  } catch {
    return undefined
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

  const controller = new AbortController()
  const timeoutMs = opts.timeoutMs ?? ENGINE_TIMEOUT_MS[engine] ?? DEFAULT_TIMEOUT_MS
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    })
    if (!res.ok) {
      // Pass the provider's reason through — the agent uses it to correct its own parameters.
      const reason = await providerError(res)
      throw new Error(
        `SearchApi ${engine} request failed: ${res.status}${reason ? ` — ${reason}` : ''}`,
      )
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}
