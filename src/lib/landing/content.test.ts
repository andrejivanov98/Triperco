import { describe, it, expect } from 'vitest'
import { destinations, experiences, lovedPlaces, allLandingItems } from './content'

describe('landing content', () => {
  it('gives every row at least ten options to scroll through', () => {
    expect(destinations.length).toBeGreaterThanOrEqual(10)
    expect(experiences.length).toBeGreaterThanOrEqual(10)
    expect(lovedPlaces.length).toBeGreaterThanOrEqual(10)
  })

  it('has loved places, each fully populated', () => {
    for (const p of lovedPlaces) {
      expect(p.id).toBeTruthy()
      expect(p.title).toBeTruthy()
      expect(p.blurb).toBeTruthy()
      expect(p.country).toBeTruthy()
      expect(p.image).toMatch(/^https:\/\//)
      expect(p.planPrompt.toLowerCase()).toContain(p.title.toLowerCase())
    }
  })

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
