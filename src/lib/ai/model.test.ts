import { describe, it, expect, afterEach, vi } from 'vitest'
import { plannerModel } from './model'

afterEach(() => vi.unstubAllEnvs())

describe('plannerModel', () => {
  it('defaults to a gemini model', () => {
    const model = plannerModel()
    expect(model).toBeTruthy()
    expect(String(model.modelId)).toContain('gemini')
  })

  it('honors the GEMINI_MODEL env override', () => {
    vi.stubEnv('GEMINI_MODEL', 'gemini-3-flash')
    expect(plannerModel().modelId).toBe('gemini-3-flash')
  })
})
