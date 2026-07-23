# Triperco SearchApi Integration Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-side data layer that calls SearchApi.io for flights, hotels, places, reviews, and photos, and normalizes each response into the domain types from Plan 1 (`Flight`, `Stay`, `Place`, `ReviewSnippet`) — with per-query caching to control cost.

**Architecture:** A thin HTTP `client` (reads `SEARCHAPI_API_KEY`, injectable `fetch` for tests) + a `cache` abstraction (in-memory now, Vercel KV in a later plan) + **pure normalizer functions** (raw SearchApi JSON → domain objects, unit-tested against real-shape fixtures) + a thin `search` orchestration module that wires client → normalizer → cache. Dependency injection everywhere means zero network calls in tests.

**Tech Stack:** TypeScript, Vitest, native `fetch` + `AbortController`. Depends on Plan 1's `src/lib/trip/types.ts`.

**Scope (Plan 2 of 5):** `google_flights`, `google_hotels`, `google_maps` (places), `google_maps_reviews`, `google_maps_photos`; the client; caching. **Out of scope (deferred to Plan 2b):** Airbnb, Tripadvisor, Google Travel/Explore — same pattern, added later. Real Vercel KV wiring stays in Plan 5. No agent/UI here.

**Prerequisite:** a `.env.local` with `SEARCHAPI_API_KEY=<your key>` for any real (non-test) call. Tests never need it (they inject fakes).

---

## SearchApi reference (verified response shapes)

All engines: `GET https://www.searchapi.io/api/v1/search?engine=<engine>&api_key=<key>&...`. Key can also go in the `Authorization: Bearer <key>` header (this plan uses the header).

- **google_flights** — params `departure_id`, `arrival_id`, `outbound_date` (YYYY-MM-DD), `flight_type` (`one_way`|`round_trip`). Response: `best_flights[]`, `other_flights[]`; each itinerary `{ price, total_duration, flights: [{ airline, flight_number, departure_airport:{id,name,time,date}, arrival_airport:{id,name,time,date}, duration, travel_class }], layovers?: [{duration,name,id}], booking_token }`.
- **google_hotels** — params `q`, `check_in_date`, `check_out_date`, `adults`. Response: `properties[]`; each `{ name, type, price_per_night:{price,extracted_price}, total_price:{price,extracted_price}, rating, reviews, gps_coordinates:{latitude,longitude}, images:[{thumbnail,original}], link, hotel_class }`.
- **google_maps** — params `q`, `ll` (`@lat,lng,zoom`). Response: `local_results[]`; each `{ title, place_id, data_id, address, phone, rating, reviews, price, type, types:[], gps_coordinates:{latitude,longitude}, website, thumbnail, images:[], hours }`.
- **google_maps_reviews** — params `place_id` (or `data_id`). Response: `reviews[]`; each `{ review_id, user:{name}, rating, snippet, text?, date, iso_date, link }`.
- **google_maps_photos** — params `place_id` (or `data_id`). Response: `photos[]`; each `{ image, thumbnail }`.

---

## File Structure

```
src/lib/searchapi/
  client.ts             # searchApi(engine, params, opts) — fetch + auth + errors; injectable fetch
  client.test.ts
  cache.ts              # Cache interface, createInMemoryCache(now), withCache()
  cache.test.ts
  normalizeFlights.ts   # pure: RawFlightsResponse -> Flight[]
  normalizeFlights.test.ts
  normalizeHotels.ts    # pure: RawHotelsResponse, nights -> Stay[]
  normalizeHotels.test.ts
  normalizePlaces.ts    # pure: RawMapsResponse -> Place[]
  normalizePlaces.test.ts
  normalizeReviews.ts   # pure: RawReviewsResponse -> ReviewSnippet[]
  normalizeReviews.test.ts
  normalizePhotos.ts    # pure: RawPhotosResponse -> string[]
  normalizePhotos.test.ts
  search.ts             # searchFlights/searchHotels/searchPlaces/getPlaceReviews/getPlacePhotos (client+cache+normalize)
  search.test.ts
```

Each normalizer is pure and independently testable. `search.ts` is the only module that touches the network, and even it accepts injected deps.

---

## Task 1: SearchApi HTTP client

**Files:**
- Create: `src/lib/searchapi/client.ts`
- Test: `src/lib/searchapi/client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/searchapi/client.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchApi } from './client'

afterEach(() => {
  vi.unstubAllEnvs()
})

function fakeFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as Response) as unknown as typeof fetch
}

describe('searchApi', () => {
  it('calls the endpoint with engine + params and returns parsed JSON', async () => {
    let calledUrl = ''
    const fetchImpl = (async (url: string) => {
      calledUrl = url
      return { ok: true, status: 200, json: async () => ({ ok: 1 }) } as Response
    }) as unknown as typeof fetch

    const res = await searchApi<{ ok: number }>(
      'google_maps',
      { q: 'Rome', ll: '@41.9,12.5,12z' },
      { apiKey: 'k', fetchImpl },
    )

    expect(res.ok).toBe(1)
    expect(calledUrl).toContain('engine=google_maps')
    expect(calledUrl).toContain('q=Rome')
    expect(calledUrl).toContain('ll=')
  })

  it('throws on a non-2xx response', async () => {
    await expect(
      searchApi('google_maps', { q: 'x' }, { apiKey: 'k', fetchImpl: fakeFetch(429, {}) }),
    ).rejects.toThrow(/429/)
  })

  it('throws when no api key is available', async () => {
    vi.stubEnv('SEARCHAPI_API_KEY', '')
    await expect(
      searchApi('google_maps', { q: 'x' }, { fetchImpl: fakeFetch(200, {}) }),
    ).rejects.toThrow(/SEARCHAPI_API_KEY/)
  })

  it('omits undefined params', async () => {
    let calledUrl = ''
    const fetchImpl = (async (url: string) => {
      calledUrl = url
      return { ok: true, status: 200, json: async () => ({}) } as Response
    }) as unknown as typeof fetch

    await searchApi('google_flights', { departure_id: 'SKP', arrival_id: undefined }, { apiKey: 'k', fetchImpl })
    expect(calledUrl).toContain('departure_id=SKP')
    expect(calledUrl).not.toContain('arrival_id')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/searchapi/client.test.ts`
Expected: FAIL — cannot find module `./client`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/searchapi/client.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/searchapi/client.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add SearchApi HTTP client"
```

---

## Task 2: Cache abstraction

**Files:**
- Create: `src/lib/searchapi/cache.ts`
- Test: `src/lib/searchapi/cache.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/searchapi/cache.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createInMemoryCache, withCache } from './cache'

describe('createInMemoryCache', () => {
  it('stores and retrieves a value', async () => {
    const cache = createInMemoryCache()
    await cache.set('k', { a: 1 }, 60)
    expect(await cache.get<{ a: number }>('k')).toEqual({ a: 1 })
  })

  it('returns null for a missing key', async () => {
    const cache = createInMemoryCache()
    expect(await cache.get('nope')).toBeNull()
  })

  it('expires values after the TTL using the injected clock', async () => {
    let clock = 1000
    const cache = createInMemoryCache(() => clock)
    await cache.set('k', 'v', 10) // expires at 1000 + 10_000
    clock = 10_999
    expect(await cache.get('k')).toBe('v')
    clock = 11_001
    expect(await cache.get('k')).toBeNull()
  })
})

describe('withCache', () => {
  it('runs fn on miss, serves cache on hit', async () => {
    const cache = createInMemoryCache()
    let calls = 0
    const run = () =>
      withCache(cache, 'k', 60, async () => {
        calls += 1
        return 'result'
      })
    expect(await run()).toBe('result')
    expect(await run()).toBe('result')
    expect(calls).toBe(1) // second call served from cache
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/searchapi/cache.test.ts`
Expected: FAIL — cannot find module `./cache`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/searchapi/cache.ts`:

```ts
export interface Cache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
}

interface Entry {
  value: unknown
  expires: number
}

/** In-memory cache. `now` is injectable for deterministic TTL tests. */
export function createInMemoryCache(now: () => number = () => Date.now()): Cache {
  const store = new Map<string, Entry>()
  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key)
      if (!entry) return null
      if (now() > entry.expires) {
        store.delete(key)
        return null
      }
      return entry.value as T
    },
    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
      store.set(key, { value, expires: now() + ttlSeconds * 1000 })
    },
  }
}

export async function withCache<T>(
  cache: Cache,
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get<T>(key)
  if (cached !== null) return cached
  const fresh = await fn()
  await cache.set(key, fresh, ttlSeconds)
  return fresh
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/searchapi/cache.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add cache abstraction with TTL"
```

---

## Task 3: Normalize flights

**Files:**
- Create: `src/lib/searchapi/normalizeFlights.ts`
- Test: `src/lib/searchapi/normalizeFlights.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/searchapi/normalizeFlights.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeFlights, type RawFlightsResponse } from './normalizeFlights'

const raw: RawFlightsResponse = {
  best_flights: [
    {
      price: 180,
      total_duration: 130,
      booking_token: 'tok_abc',
      flights: [
        {
          airline: 'Wizz Air',
          flight_number: 'W6 1234',
          departure_airport: { id: 'SKP', name: 'Skopje', time: '10:00', date: '2026-05-01' },
          arrival_airport: { id: 'FCO', name: 'Rome', time: '12:10', date: '2026-05-01' },
          duration: 130,
        },
      ],
      layovers: [],
    },
  ],
  other_flights: [
    {
      price: 150,
      total_duration: 300,
      flights: [
        {
          airline: 'ITA',
          flight_number: 'AZ 1',
          departure_airport: { id: 'SKP', name: 'Skopje', time: '06:00', date: '2026-05-01' },
          arrival_airport: { id: 'VIE', name: 'Vienna', time: '07:00', date: '2026-05-01' },
          duration: 60,
        },
        {
          airline: 'ITA',
          flight_number: 'AZ 2',
          departure_airport: { id: 'VIE', name: 'Vienna', time: '09:00', date: '2026-05-01' },
          arrival_airport: { id: 'FCO', name: 'Rome', time: '10:30', date: '2026-05-01' },
          duration: 90,
        },
      ],
      layovers: [{ duration: 120, name: 'Vienna', id: 'VIE' }],
    },
  ],
}

describe('normalizeFlights', () => {
  it('flattens best_flights + other_flights into Flight[]', () => {
    const flights = normalizeFlights(raw)
    expect(flights).toHaveLength(2)
  })

  it('maps a nonstop itinerary correctly', () => {
    const f = normalizeFlights(raw)[0]
    expect(f.id).toBe('tok_abc')
    expect(f.from).toBe('SKP')
    expect(f.to).toBe('FCO')
    expect(f.airline).toBe('Wizz Air')
    expect(f.departTime).toBe('10:00')
    expect(f.arriveTime).toBe('12:10')
    expect(f.durationMinutes).toBe(130)
    expect(f.stops).toBe(0)
    expect(f.price).toBe(180)
    expect(f.bookUrl).toContain('google.com/travel/flights')
  })

  it('derives stops and endpoints for a connecting itinerary', () => {
    const f = normalizeFlights(raw)[1]
    expect(f.from).toBe('SKP')
    expect(f.to).toBe('FCO')
    expect(f.stops).toBe(1)
    expect(f.id).toBe('AZ 1-AZ 2') // no booking_token -> flight numbers joined
  })

  it('returns [] when there are no flights', () => {
    expect(normalizeFlights({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/searchapi/normalizeFlights.test.ts`
Expected: FAIL — cannot find module `./normalizeFlights`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/searchapi/normalizeFlights.ts`:

```ts
import type { Flight } from '../trip/types'

interface RawAirport {
  id: string
  name?: string
  time?: string
  date?: string
}

interface RawSegment {
  airline?: string
  flight_number?: string
  departure_airport: RawAirport
  arrival_airport: RawAirport
  duration?: number
}

interface RawItinerary {
  price?: number
  total_duration?: number
  booking_token?: string
  flights: RawSegment[]
  layovers?: { duration?: number; name?: string; id?: string }[]
}

export interface RawFlightsResponse {
  best_flights?: RawItinerary[]
  other_flights?: RawItinerary[]
}

function googleFlightsUrl(from: string, to: string, date?: string): string {
  const q = `Flights from ${from} to ${to}${date ? ` on ${date}` : ''}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

function toFlight(itin: RawItinerary): Flight {
  const segments = itin.flights
  const first = segments[0]
  const last = segments[segments.length - 1]
  const from = first.departure_airport.id
  const to = last.arrival_airport.id
  const id =
    itin.booking_token ?? segments.map((s) => s.flight_number ?? '?').join('-')
  const stops = itin.layovers?.length ?? Math.max(0, segments.length - 1)
  return {
    id,
    from,
    to,
    airline: first.airline,
    departTime: first.departure_airport.time,
    arriveTime: last.arrival_airport.time,
    durationMinutes: itin.total_duration,
    stops,
    price: itin.price ?? 0,
    bookUrl: googleFlightsUrl(from, to, first.departure_airport.date),
  }
}

export function normalizeFlights(raw: RawFlightsResponse): Flight[] {
  const all = [...(raw.best_flights ?? []), ...(raw.other_flights ?? [])]
  return all.map(toFlight)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/searchapi/normalizeFlights.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add flight normalizer"
```

---

## Task 4: Normalize hotels

**Files:**
- Create: `src/lib/searchapi/normalizeHotels.ts`
- Test: `src/lib/searchapi/normalizeHotels.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/searchapi/normalizeHotels.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeHotels, type RawHotelsResponse } from './normalizeHotels'

const raw: RawHotelsResponse = {
  properties: [
    {
      name: 'Hotel Trastevere',
      type: 'hotel',
      price_per_night: { price: '$110', extracted_price: 110 },
      total_price: { price: '$330', extracted_price: 330 },
      rating: 4.6,
      reviews: 1204,
      gps_coordinates: { latitude: 41.88, longitude: 12.47 },
      images: [{ thumbnail: 'https://t/1', original: 'https://o/1' }],
      link: 'https://book/hotel',
      hotel_class: '4-star hotel',
    },
  ],
}

describe('normalizeHotels', () => {
  it('maps a property into a Stay with the given nights', () => {
    const [stay] = normalizeHotels(raw, 3)
    expect(stay.name).toBe('Hotel Trastevere')
    expect(stay.source).toBe('hotel')
    expect(stay.pricePerNight).toBe(110)
    expect(stay.nights).toBe(3)
    expect(stay.rating).toBe(4.6)
    expect(stay.reviewCount).toBe(1204)
    expect(stay.coords).toEqual({ lat: 41.88, lng: 12.47 })
    expect(stay.photos).toEqual(['https://o/1'])
    expect(stay.bookUrl).toBe('https://book/hotel')
    expect(stay.id).toBeTruthy()
  })

  it('returns [] with no properties', () => {
    expect(normalizeHotels({}, 2)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/searchapi/normalizeHotels.test.ts`
Expected: FAIL — cannot find module `./normalizeHotels`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/searchapi/normalizeHotels.ts`:

```ts
import type { Stay } from '../trip/types'

interface RawProperty {
  name: string
  type?: string
  price_per_night?: { extracted_price?: number }
  rating?: number
  reviews?: number
  gps_coordinates?: { latitude: number; longitude: number }
  images?: { thumbnail?: string; original?: string }[]
  link?: string
}

export interface RawHotelsResponse {
  properties?: RawProperty[]
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function normalizeHotels(raw: RawHotelsResponse, nights: number): Stay[] {
  return (raw.properties ?? []).map((p, i) => ({
    id: `${slugify(p.name)}-${i}`,
    name: p.name,
    source: 'hotel' as const,
    coords: p.gps_coordinates
      ? { lat: p.gps_coordinates.latitude, lng: p.gps_coordinates.longitude }
      : undefined,
    rating: p.rating,
    reviewCount: p.reviews,
    pricePerNight: p.price_per_night?.extracted_price ?? 0,
    nights,
    photos: (p.images ?? []).map((img) => img.original ?? img.thumbnail ?? '').filter(Boolean),
    bookUrl: p.link ?? '',
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/searchapi/normalizeHotels.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add hotel normalizer"
```

---

## Task 5: Normalize places

**Files:**
- Create: `src/lib/searchapi/normalizePlaces.ts`
- Test: `src/lib/searchapi/normalizePlaces.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/searchapi/normalizePlaces.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizePlaces, type RawMapsResponse } from './normalizePlaces'

const raw: RawMapsResponse = {
  local_results: [
    {
      title: 'Colosseum',
      place_id: 'PID1',
      data_id: 'DID1',
      address: 'Piazza del Colosseo, Rome',
      rating: 4.7,
      reviews: 390000,
      price: '$$',
      type: 'Historical landmark',
      types: ['Historical landmark', 'Tourist attraction'],
      gps_coordinates: { latitude: 41.8902, longitude: 12.4922 },
      thumbnail: 'https://t/colosseum',
      hours: 'Open ⋅ Closes 7 PM',
    },
  ],
}

describe('normalizePlaces', () => {
  it('maps a local result into a Place', () => {
    const [place] = normalizePlaces(raw)
    expect(place.id).toBe('PID1')
    expect(place.name).toBe('Colosseum')
    expect(place.coords).toEqual({ lat: 41.8902, lng: 12.4922 })
    expect(place.category).toBe('Historical landmark')
    expect(place.rating).toBe(4.7)
    expect(place.reviewCount).toBe(390000)
    expect(place.priceLevel).toBe(2) // "$$"
    expect(place.address).toBe('Piazza del Colosseo, Rome')
    expect(place.photos).toEqual(['https://t/colosseum'])
    expect(place.reviewSnippets).toEqual([]) // filled by enrichment later
    expect(place.sourceLinks.maps).toContain('PID1')
  })

  it('returns [] with no local_results', () => {
    expect(normalizePlaces({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/searchapi/normalizePlaces.test.ts`
Expected: FAIL — cannot find module `./normalizePlaces`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/searchapi/normalizePlaces.ts`:

```ts
import type { Place } from '../trip/types'

interface RawLocalResult {
  title: string
  place_id: string
  data_id?: string
  address?: string
  rating?: number
  reviews?: number
  price?: string
  type?: string
  types?: string[]
  gps_coordinates?: { latitude: number; longitude: number }
  thumbnail?: string
  images?: string[]
  hours?: string
}

export interface RawMapsResponse {
  local_results?: RawLocalResult[]
}

function priceLevel(price?: string): number | undefined {
  if (!price) return undefined
  const dollars = (price.match(/\$/g) ?? []).length
  return dollars > 0 ? dollars : undefined
}

export function normalizePlaces(raw: RawMapsResponse): Place[] {
  return (raw.local_results ?? []).map((r) => {
    const photos: string[] = []
    if (r.thumbnail) photos.push(r.thumbnail)
    else if (r.images?.length) photos.push(...r.images)
    return {
      id: r.place_id,
      name: r.title,
      coords: r.gps_coordinates
        ? { lat: r.gps_coordinates.latitude, lng: r.gps_coordinates.longitude }
        : undefined,
      category: r.type,
      rating: r.rating,
      reviewCount: r.reviews,
      priceLevel: priceLevel(r.price),
      photos,
      reviewSnippets: [],
      hours: r.hours,
      address: r.address,
      sourceLinks: {
        maps: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
      },
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/searchapi/normalizePlaces.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add place normalizer"
```

---

## Task 6: Normalize reviews

**Files:**
- Create: `src/lib/searchapi/normalizeReviews.ts`
- Test: `src/lib/searchapi/normalizeReviews.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/searchapi/normalizeReviews.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeReviews, type RawReviewsResponse } from './normalizeReviews'

const raw: RawReviewsResponse = {
  reviews: [
    { review_id: 'r1', user: { name: 'Ana' }, rating: 5, snippet: 'Incredible history.', date: '2 days ago' },
    { review_id: 'r2', user: { name: 'Marko' }, rating: 4, text: 'Busy but worth it.', date: '1 week ago' },
    { review_id: 'r3', user: { name: 'NoText' }, rating: 3, date: '3 weeks ago' },
  ],
}

describe('normalizeReviews', () => {
  it('maps reviews, preferring snippet then text', () => {
    const out = normalizeReviews(raw)
    expect(out[0]).toEqual({ author: 'Ana', rating: 5, text: 'Incredible history.' })
    expect(out[1].text).toBe('Busy but worth it.')
  })

  it('drops reviews with no text', () => {
    const out = normalizeReviews(raw)
    expect(out).toHaveLength(2) // r3 has no snippet/text
  })

  it('returns [] with no reviews', () => {
    expect(normalizeReviews({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/searchapi/normalizeReviews.test.ts`
Expected: FAIL — cannot find module `./normalizeReviews`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/searchapi/normalizeReviews.ts`:

```ts
import type { ReviewSnippet } from '../trip/types'

interface RawReview {
  review_id?: string
  user?: { name?: string }
  rating?: number
  snippet?: string
  text?: string
  date?: string
}

export interface RawReviewsResponse {
  reviews?: RawReview[]
}

export function normalizeReviews(raw: RawReviewsResponse): ReviewSnippet[] {
  return (raw.reviews ?? [])
    .map((r) => {
      const text = r.snippet ?? r.text
      if (!text) return null
      return { author: r.user?.name, rating: r.rating, text }
    })
    .filter((r): r is ReviewSnippet => r !== null)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/searchapi/normalizeReviews.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add review normalizer"
```

---

## Task 7: Normalize photos

**Files:**
- Create: `src/lib/searchapi/normalizePhotos.ts`
- Test: `src/lib/searchapi/normalizePhotos.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/searchapi/normalizePhotos.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizePhotos, type RawPhotosResponse } from './normalizePhotos'

const raw: RawPhotosResponse = {
  photos: [
    { image: 'https://full/1', thumbnail: 'https://thumb/1' },
    { thumbnail: 'https://thumb/2' }, // no full image
  ],
}

describe('normalizePhotos', () => {
  it('prefers full image, falls back to thumbnail', () => {
    expect(normalizePhotos(raw)).toEqual(['https://full/1', 'https://thumb/2'])
  })

  it('returns [] with no photos', () => {
    expect(normalizePhotos({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/searchapi/normalizePhotos.test.ts`
Expected: FAIL — cannot find module `./normalizePhotos`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/searchapi/normalizePhotos.ts`:

```ts
interface RawPhoto {
  image?: string
  thumbnail?: string
}

export interface RawPhotosResponse {
  photos?: RawPhoto[]
}

export function normalizePhotos(raw: RawPhotosResponse): string[] {
  return (raw.photos ?? [])
    .map((p) => p.image ?? p.thumbnail ?? '')
    .filter(Boolean)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/searchapi/normalizePhotos.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add photo normalizer"
```

---

## Task 8: Search orchestration (client + cache + normalize)

**Files:**
- Create: `src/lib/searchapi/search.ts`
- Test: `src/lib/searchapi/search.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/searchapi/search.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { searchFlights, searchHotels, searchPlaces, getPlaceReviews, getPlacePhotos } from './search'
import { createInMemoryCache } from './cache'

// A fake search fn that records calls and returns canned raw responses per engine.
function fakeDeps(responses: Record<string, unknown>) {
  const calls: string[] = []
  const cache = createInMemoryCache()
  const search = async <T>(engine: string): Promise<T> => {
    calls.push(engine)
    return responses[engine] as T
  }
  return { deps: { search, cache }, calls }
}

describe('searchFlights', () => {
  it('normalizes and caches by query', async () => {
    const { deps, calls } = fakeDeps({
      google_flights: {
        best_flights: [
          {
            price: 180,
            total_duration: 130,
            booking_token: 't',
            flights: [
              {
                airline: 'Wizz',
                flight_number: 'W6 1',
                departure_airport: { id: 'SKP', time: '10:00', date: '2026-05-01' },
                arrival_airport: { id: 'FCO', time: '12:10' },
              },
            ],
            layovers: [],
          },
        ],
      },
    })
    const params = { departure_id: 'SKP', arrival_id: 'FCO', outbound_date: '2026-05-01' }
    const first = await searchFlights(params, deps)
    const second = await searchFlights(params, deps)
    expect(first).toHaveLength(1)
    expect(first[0].to).toBe('FCO')
    expect(second).toEqual(first)
    expect(calls.filter((c) => c === 'google_flights')).toHaveLength(1) // cached
  })
})

describe('searchHotels', () => {
  it('computes nights from dates and normalizes', async () => {
    const { deps } = fakeDeps({
      google_hotels: {
        properties: [
          {
            name: 'Hotel X',
            price_per_night: { extracted_price: 100 },
            rating: 4.2,
            reviews: 10,
            gps_coordinates: { latitude: 1, longitude: 2 },
            images: [],
            link: 'https://x',
          },
        ],
      },
    })
    const stays = await searchHotels(
      { q: 'Rome', check_in_date: '2026-05-01', check_out_date: '2026-05-04', adults: 2 },
      deps,
    )
    expect(stays[0].nights).toBe(3)
    expect(stays[0].pricePerNight).toBe(100)
  })
})

describe('searchPlaces', () => {
  it('normalizes local results', async () => {
    const { deps } = fakeDeps({
      google_maps: {
        local_results: [
          { title: 'Colosseum', place_id: 'PID1', gps_coordinates: { latitude: 1, longitude: 2 } },
        ],
      },
    })
    const places = await searchPlaces({ q: 'attractions', ll: '@1,2,12z' }, deps)
    expect(places[0].name).toBe('Colosseum')
  })
})

describe('getPlaceReviews / getPlacePhotos', () => {
  it('returns normalized reviews', async () => {
    const { deps } = fakeDeps({
      google_maps_reviews: { reviews: [{ user: { name: 'A' }, rating: 5, snippet: 'Great' }] },
    })
    const reviews = await getPlaceReviews('PID1', deps)
    expect(reviews[0].text).toBe('Great')
  })

  it('returns normalized photos', async () => {
    const { deps } = fakeDeps({
      google_maps_photos: { photos: [{ image: 'https://p/1' }] },
    })
    const photos = await getPlacePhotos('PID1', deps)
    expect(photos).toEqual(['https://p/1'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/lib/searchapi/search.test.ts`
Expected: FAIL — cannot find module `./search`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/searchapi/search.ts`:

```ts
import type { Flight, Stay, Place, ReviewSnippet } from '../trip/types'
import { searchApi, type SearchApiOptions, type SearchParams } from './client'
import { createInMemoryCache, withCache, type Cache } from './cache'
import { normalizeFlights, type RawFlightsResponse } from './normalizeFlights'
import { normalizeHotels, type RawHotelsResponse } from './normalizeHotels'
import { normalizePlaces, type RawMapsResponse } from './normalizePlaces'
import { normalizeReviews, type RawReviewsResponse } from './normalizeReviews'
import { normalizePhotos, type RawPhotosResponse } from './normalizePhotos'

export type SearchFn = <T>(engine: string, params: SearchParams) => Promise<T>

export interface SearchDeps {
  search?: SearchFn
  cache?: Cache
  clientOptions?: SearchApiOptions
}

export const TTL = {
  flights: 900, // 15 min
  hotels: 900,
  places: 86_400, // 24 h
  reviews: 86_400,
  photos: 86_400,
} as const

// Module-level default cache so real usage shares one cache across calls.
const defaultCache = createInMemoryCache()

function resolve(deps?: SearchDeps): { search: SearchFn; cache: Cache } {
  const cache = deps?.cache ?? defaultCache
  const search =
    deps?.search ??
    (<T>(engine: string, params: SearchParams) =>
      searchApi<T>(engine, params, deps?.clientOptions))
  return { search, cache }
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

export interface FlightParams {
  departure_id: string
  arrival_id: string
  outbound_date: string
  flight_type?: 'one_way' | 'round_trip'
}

export async function searchFlights(params: FlightParams, deps?: SearchDeps): Promise<Flight[]> {
  const { search, cache } = resolve(deps)
  const type = params.flight_type ?? 'one_way'
  const key = `google_flights:${params.departure_id}:${params.arrival_id}:${params.outbound_date}:${type}`
  return withCache(cache, key, TTL.flights, async () => {
    const raw = await search<RawFlightsResponse>('google_flights', {
      departure_id: params.departure_id,
      arrival_id: params.arrival_id,
      outbound_date: params.outbound_date,
      flight_type: type,
    })
    return normalizeFlights(raw)
  })
}

export interface HotelParams {
  q: string
  check_in_date: string
  check_out_date: string
  adults?: number
}

export async function searchHotels(params: HotelParams, deps?: SearchDeps): Promise<Stay[]> {
  const { search, cache } = resolve(deps)
  const key = `google_hotels:${params.q}:${params.check_in_date}:${params.check_out_date}:${params.adults ?? 2}`
  const nights = nightsBetween(params.check_in_date, params.check_out_date)
  return withCache(cache, key, TTL.hotels, async () => {
    const raw = await search<RawHotelsResponse>('google_hotels', {
      q: params.q,
      check_in_date: params.check_in_date,
      check_out_date: params.check_out_date,
      adults: params.adults ?? 2,
    })
    return normalizeHotels(raw, nights)
  })
}

export interface PlaceParams {
  q: string
  ll?: string
}

export async function searchPlaces(params: PlaceParams, deps?: SearchDeps): Promise<Place[]> {
  const { search, cache } = resolve(deps)
  const key = `google_maps:${params.q}:${params.ll ?? ''}`
  return withCache(cache, key, TTL.places, async () => {
    const raw = await search<RawMapsResponse>('google_maps', {
      q: params.q,
      ll: params.ll,
    })
    return normalizePlaces(raw)
  })
}

export async function getPlaceReviews(placeId: string, deps?: SearchDeps): Promise<ReviewSnippet[]> {
  const { search, cache } = resolve(deps)
  const key = `google_maps_reviews:${placeId}`
  return withCache(cache, key, TTL.reviews, async () => {
    const raw = await search<RawReviewsResponse>('google_maps_reviews', { place_id: placeId })
    return normalizeReviews(raw)
  })
}

export async function getPlacePhotos(placeId: string, deps?: SearchDeps): Promise<string[]> {
  const { search, cache } = resolve(deps)
  const key = `google_maps_photos:${placeId}`
  return withCache(cache, key, TTL.photos, async () => {
    const raw = await search<RawPhotosResponse>('google_maps_photos', { place_id: placeId })
    return normalizePhotos(raw)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/lib/searchapi/search.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add SearchApi search orchestration with caching"
```

---

## Task 9: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: PASS — Plan 1 suites + all new `src/lib/searchapi` suites green.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Clean tree**

Run: `git status`
Expected: nothing to commit, working tree clean.

---

## Definition of done

- `npm run typecheck`, `npm test`, and `npm run build` all pass.
- `src/lib/searchapi` exposes `searchFlights`, `searchHotels`, `searchPlaces`, `getPlaceReviews`, `getPlacePhotos`, each returning Plan 1 domain types, cached per query, with all network access injectable (tests are network-free).
- Every task committed.

**Next:** Plan 3 — the chat agent (Gemini via AI SDK) that calls these functions as tools and mutates `TripState`. (Plan 2b — Airbnb / Tripadvisor / Google Travel Explore — can slot in before or after Plan 3, following the same normalizer + orchestration pattern.)
