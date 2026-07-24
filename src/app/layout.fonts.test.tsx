import { describe, it, expect, vi } from 'vitest'

// next/font/google is a build-time macro — it is not callable under vitest.
// Mock it so each font factory echoes back the `variable` we pass, which lets us
// assert the layout wires the exact CSS-variable names the @theme tokens depend on.
vi.mock('next/font/google', () => ({
  Inter: (opts: { variable: string }) => ({ variable: opts.variable, className: 'inter' }),
  Fraunces: (opts: { variable: string }) => ({ variable: opts.variable, className: 'fraunces' }),
}))
vi.mock('./globals.css', () => ({}))

import { inter, fraunces } from './layout'

describe('layout fonts', () => {
  it('exposes Inter as the --font-inter CSS variable', () => {
    expect(inter.variable).toBe('--font-inter')
  })

  it('exposes Fraunces as the --font-fraunces CSS variable', () => {
    expect(fraunces.variable).toBe('--font-fraunces')
  })
})
