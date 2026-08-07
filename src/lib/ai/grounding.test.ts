import { describe, it, expect } from 'vitest'
import {
  anchorToDestination,
  destinationTokens,
  foldPlaceName,
  formatGrounding,
  namesDestination,
  offDestinationError,
} from './grounding'

describe('foldPlaceName', () => {
  it('folds case and punctuation', () => {
    expect(foldPlaceName('Barcelona, Spain')).toBe('barcelona spain')
  })

  /** The accent must not become a space, or "Málaga" stops matching anything anybody types. */
  it('strips accents without leaving a gap where they were', () => {
    expect(foldPlaceName('Málaga')).toBe('malaga')
    expect(foldPlaceName('Zürich')).toBe('zurich')
    expect(foldPlaceName('São Paulo')).toBe('sao paulo')
  })

  it('is empty for nothing worth matching', () => {
    expect(foldPlaceName('   ')).toBe('')
    expect(foldPlaceName('—')).toBe('')
  })
})

describe('destinationTokens', () => {
  it('offers the whole name and each part of it', () => {
    expect(destinationTokens('Barcelona, Spain')).toEqual(['barcelona spain', 'barcelona', 'spain'])
  })

  it('does not repeat a single-part destination', () => {
    expect(destinationTokens('Tenerife')).toEqual(['tenerife'])
  })

  it('drops fragments too short to mean anything', () => {
    expect(destinationTokens('Rome, IT')).toEqual(['rome it', 'rome'])
  })
})

describe('namesDestination', () => {
  it('recognises the destination however it is cased or accented', () => {
    expect(namesDestination('hotels in BARCELONA', 'Barcelona, Spain')).toBe(true)
    expect(namesDestination('best tapas in Malaga', 'Málaga')).toBe(true)
  })

  it('is false for a query that says nowhere', () => {
    expect(namesDestination('best restaurants', 'Barcelona, Spain')).toBe(false)
    expect(namesDestination('', 'Barcelona')).toBe(false)
  })
})

/**
 * The text half of the destination fence.
 *
 * `google_maps` and `google_hotels` resolve a query with no locality in it against their own default,
 * which is the United States — so "hotels" for a Barcelona trip really did return American hotels.
 * The wrong question had already been asked; nothing downstream could have saved it.
 */
describe('anchorToDestination', () => {
  it('says where a query that says nowhere is asking about', () => {
    expect(anchorToDestination('best restaurants', 'Barcelona, Spain')).toBe(
      'best restaurants in Barcelona, Spain',
    )
  })

  /** The model's own words carry *what* it is looking for. That half must survive. */
  it('keeps what was being asked for', () => {
    expect(anchorToDestination('walking tours', 'Rome')).toBe('walking tours in Rome')
  })

  it('leaves a query that already names the destination alone', () => {
    expect(anchorToDestination('top sights in Rome', 'Rome')).toBe('top sights in Rome')
    expect(anchorToDestination('hotels in Spain', 'Barcelona, Spain')).toBe('hotels in Spain')
  })

  it('does nothing at all before there is a destination', () => {
    expect(anchorToDestination('best restaurants', undefined)).toBe('best restaurants')
    expect(anchorToDestination('best restaurants', '  ')).toBe('best restaurants')
  })

  it('falls back to the destination when the query is empty', () => {
    expect(anchorToDestination('  ', 'Rome')).toBe('Rome')
  })
})

describe('offDestinationError', () => {
  it('names the place and tells the model what to do about it', () => {
    const message = offDestinationError('Barcelona', 'stays')
    expect(message).toContain('Barcelona')
    expect(message.toLowerCase()).toContain('search again')
  })
})

describe('formatGrounding', () => {
  it('states the destination as a standing rule', () => {
    const block = formatGrounding('Barcelona')
    expect(block).toContain('EVERYTHING YOU SHOW IS IN BARCELONA')
    // What the app does, not only what the model should do: a model told results get dropped has a
    // reason to search again rather than narrate an empty carousel.
    expect(block.toLowerCase()).toContain('drops any result')
    expect(block.toLowerCase()).toContain('united states')
  })

  it('says nothing before there is a destination to be grounded in', () => {
    expect(formatGrounding(undefined)).toBe('')
    expect(formatGrounding('   ')).toBe('')
  })
})
