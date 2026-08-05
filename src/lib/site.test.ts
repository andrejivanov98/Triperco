import { describe, it, expect, vi, afterEach } from 'vitest'

/**
 * `siteUrl` is a module constant read at import time, so each case needs a fresh module registry.
 * Worth the ceremony: this value is baked into robots.txt and sitemap.xml at build time, and a wrong
 * one is invisible in the app while telling Google the wrong thing.
 */
async function resolve(env: Record<string, string | undefined>): Promise<string> {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  return (await import('./site')).siteUrl
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

const NONE = {
  NEXT_PUBLIC_SITE_URL: undefined,
  VERCEL_PROJECT_PRODUCTION_URL: undefined,
  VERCEL_URL: undefined,
}

describe('siteUrl', () => {
  it('prefers the explicit override, which is how a custom domain is named', async () => {
    expect(
      await resolve({
        ...NONE,
        NEXT_PUBLIC_SITE_URL: 'triperco.com',
        VERCEL_PROJECT_PRODUCTION_URL: 'triperco.vercel.app',
      }),
    ).toBe('https://triperco.com')
  })

  it('accepts an override that already carries a scheme, without doubling it', async () => {
    expect(await resolve({ ...NONE, NEXT_PUBLIC_SITE_URL: 'https://triperco.com' })).toBe(
      'https://triperco.com',
    )
  })

  it('drops a trailing slash, so sitemap URLs never contain a double slash', async () => {
    expect(await resolve({ ...NONE, NEXT_PUBLIC_SITE_URL: 'triperco.com/' })).toBe(
      'https://triperco.com',
    )
  })

  it('uses the stable production host over the deployment host', async () => {
    // A preview deployment must not name itself as canonical and compete with production.
    expect(
      await resolve({
        ...NONE,
        VERCEL_PROJECT_PRODUCTION_URL: 'triperco.vercel.app',
        VERCEL_URL: 'triperco-abc123.vercel.app',
      }),
    ).toBe('https://triperco.vercel.app')
  })

  it('never falls back to localhost while running on Vercel', async () => {
    // The failure this guards against: publishing "Host: http://localhost:3000" to Google.
    expect(await resolve({ ...NONE, VERCEL_URL: 'triperco-abc123.vercel.app' })).toBe(
      'https://triperco-abc123.vercel.app',
    )
  })

  it('falls back to localhost only when nothing else is set', async () => {
    expect(await resolve(NONE)).toBe('http://localhost:3000')
  })

  it('is always a parseable absolute origin', async () => {
    for (const env of [
      { ...NONE, NEXT_PUBLIC_SITE_URL: 'triperco.com' },
      { ...NONE, VERCEL_URL: 'x.vercel.app' },
      NONE,
    ]) {
      const url = await resolve(env)
      expect(() => new URL(url)).not.toThrow()
      expect(url).not.toMatch(/\/$/)
    }
  })
})
