import { describe, it, expect } from 'vitest'
import { destinations, experiences, allLandingItems } from './content'

describe('landing content', () => {
  it('has several destinations, each fully populated', () => {
    expect(destinations.length).toBeGreaterThanOrEqual(4)
    for (const d of destinations) {
      expect(d.id).toBeTruthy()
      expect(d.title).toBeTruthy()
      expect(d.blurb).toBeTruthy()
      expect(d.image).toMatch(/^https:\/\//)
      expect(d.planPrompt.toLowerCase()).toContain(d.title.toLowerCase())
    }
  })

  it('has experiences, each fully populated', () => {
    expect(experiences.length).toBeGreaterThanOrEqual(4)
    for (const e of experiences) {
      expect(e.id).toBeTruthy()
      expect(e.title).toBeTruthy()
      expect(e.image).toMatch(/^https:\/\//)
      expect(e.planPrompt).toBeTruthy()
    }
  })

  it('exposes unique ids across all items', () => {
    const ids = allLandingItems().map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
