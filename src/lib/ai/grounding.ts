/**
 * Keeping a search on the trip it belongs to.
 *
 * The provider's search engines are geo-biased: `"best restaurants"` with no locality in it resolves
 * against their own default, which is the United States. That is how a traveler planning Barcelona
 * came to be shown hotels in America — nothing was wrong with the results, the question was wrong.
 *
 * These are the text half of the fix. The other half is `partitionNear`, which drops what came back
 * from somewhere else regardless of how the question was phrased.
 */

/**
 * Fold case, strip accents, and reduce punctuation to spaces, so "Málaga" matches "malaga".
 *
 * The combining marks go first, as their own step. Leaving them to the punctuation pass would turn
 * the decomposed "Málaga" into "ma laga" — a space where the accent was, and no longer a match for
 * anything the traveler typed.
 */
export function foldPlaceName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * The parts of a destination worth matching on, longest first.
 *
 * "Barcelona, Spain" yields "barcelona spain", "barcelona" and "spain". A query naming any of them is
 * already anchored — appending the destination again would produce "hotels in Barcelona, Spain,
 * Barcelona, Spain", which is a worse question than the one we started with.
 */
export function destinationTokens(destination: string): string[] {
  const whole = foldPlaceName(destination)
  if (!whole) return []
  const parts = destination
    .split(',')
    .map(foldPlaceName)
    .filter((part) => part.length >= 3)
  return [...new Set([whole, ...parts])].filter((token) => token.length >= 3)
}

/** Whether a query already says where it is asking about. */
export function namesDestination(query: string, destination: string): boolean {
  const folded = foldPlaceName(query)
  if (!folded) return false
  return destinationTokens(destination).some((token) => folded.includes(token))
}

/**
 * The same query, anchored to the destination.
 *
 * Appended rather than rewritten: the model's own words carry what sort of thing it is looking for
 * ("walking tours", "cheap eats near the beach"), and that is the half we must not lose.
 */
export function anchorToDestination(query: string, destination: string | undefined): string {
  const where = destination?.trim()
  if (!where) return query.trim()
  const asked = query.trim()
  if (!asked) return where
  if (namesDestination(asked, where)) return asked
  return `${asked} in ${where}`
}

/** What the tool tells the model when every result came back from somewhere else entirely. */
export function offDestinationError(destination: string, kind: 'stays' | 'places'): string {
  const noun = kind === 'stays' ? 'None of those stays' : 'None of those places'
  return (
    `${noun} are anywhere near ${destination}, so none of them were shown. The search engine ` +
    `defaults to the United States when a query does not say where it is asking about. Search again ` +
    `with ${destination} named in the query — and never describe results the traveler cannot see.`
  )
}

/**
 * The standing rule about where results come from. Only worth stating once the destination is known.
 *
 * Deliberately says what the *app* does, not only what the model should do. A model told "the app
 * drops results that are not near Barcelona and will tell you it did" has a reason to search again
 * rather than narrate an empty carousel.
 */
export function formatGrounding(destination: string | undefined): string {
  const where = destination?.trim()
  if (!where) return ''
  return [
    `EVERYTHING YOU SHOW IS IN ${where.toUpperCase()}`,
    `This trip goes to ${where}. Unless the traveler names somewhere else in this very message, every`,
    'stay, place, restaurant, tour and event you search for is there.',
    `- Name it in every query: "hotels in ${where}", "top sights in ${where}". A query without it`,
    "  resolves against the search engine's own default, which is the United States.",
    `- The app drops any result that is not near ${where} and tells you when it did. If a search comes`,
    '  back off-target, search again with the city and country named — never describe results the',
    '  traveler is not looking at.',
    `- Fly them to an airport that actually serves ${where}, and never back to where they set off from.`,
  ].join('\n')
}
