import { describe, it, expect, vi } from 'vitest'

// next/font/google is a build-time macro — it is not callable under vitest.
// Mock it so each font factory echoes back the `variable` we pass, which lets us
// assert we wire the exact CSS-variable names the @theme tokens depend on.
vi.mock('next/font/google', () => ({
  Inter: (opts: { variable: string }) => ({ variable: opts.variable, className: 'inter' }),
  Fraunces: (opts: { variable: string }) => ({ variable: opts.variable, className: 'fraunces' }),
  Plus_Jakarta_Sans: (opts: { variable: string }) => ({
    variable: opts.variable,
    className: 'jakarta',
  }),
}))

import { inter, fraunces, jakarta } from './fonts'

describe('fonts', () => {
  it('exposes Inter as the --font-inter CSS variable', () => {
    expect(inter.variable).toBe('--font-inter')
  })

  it('exposes Fraunces as the --font-fraunces CSS variable', () => {
    expect(fraunces.variable).toBe('--font-fraunces')
  })

  it('exposes the brand face as the --font-jakarta CSS variable', () => {
    expect(jakarta.variable).toBe('--font-jakarta')
  })
})
