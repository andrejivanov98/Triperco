export type SearchParams = Record<string, string | number | undefined>

export interface SearchApiOptions {
  apiKey?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  baseUrl?: string
}

const DEFAULT_BASE_URL = 'https://www.searchapi.io/api/v1/search'

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
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000)
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`SearchApi ${engine} request failed: ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}
