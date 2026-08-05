import { describe, it, expect, vi, afterEach } from 'vitest'

// Build-time macros, neither callable under vitest. The metadata block is what is under test here.
vi.mock('next/font/google', () => ({
  Inter: (o: { variable: string }) => ({ variable: o.variable }),
  Fraunces: (o: { variable: string }) => ({ variable: o.variable }),
  Plus_Jakarta_Sans: (o: { variable: string }) => ({ variable: o.variable }),
}))
vi.mock('./globals.css', () => ({}))

const ORIGINAL = process.env.GOOGLE_SITE_VERIFICATION

/** Re-imports the layout, since the metadata block reads the environment once at module load. */
async function metadata(token?: string) {
  vi.resetModules()
  if (token === undefined) delete process.env.GOOGLE_SITE_VERIFICATION
  else process.env.GOOGLE_SITE_VERIFICATION = token
  return (await import('./layout')).metadata
}

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.GOOGLE_SITE_VERIFICATION
  else process.env.GOOGLE_SITE_VERIFICATION = ORIGINAL
})

describe('root metadata', () => {
  it('asks Google for a full-size image preview, which is the point of setting robots at all', async () => {
    const robots = (await metadata()).robots as { googleBot: Record<string, unknown> }
    expect(robots.googleBot['max-image-preview']).toBe('large')
    expect(robots.googleBot['max-snippet']).toBe(-1)
  })

  it('still lets crawlers in', async () => {
    const robots = (await metadata()).robots as { index: boolean; follow: boolean }
    expect(robots.index).toBe(true)
    expect(robots.follow).toBe(true)
  })

  /**
   * An empty content="" is not a missing tag — Search Console reads it as a failed check. Absent a
   * token the key has to disappear entirely.
   */
  it('omits verification entirely when no token is configured', async () => {
    expect((await metadata()).verification).toBeUndefined()
  })

  it('states the token when one is configured', async () => {
    expect((await metadata('test-token')).verification).toEqual({ google: 'test-token' })
  })

  /**
   * A canonical on the root layout is inherited by every page that does not set its own, pointing
   * the whole site at the homepage. Each page declares one instead, so this must stay empty.
   */
  it('sets no site-wide canonical', async () => {
    expect((await metadata()).alternates?.canonical).toBeUndefined()
  })
})
