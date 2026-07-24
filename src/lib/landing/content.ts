export interface Destination {
  id: string
  title: string
  country: string
  blurb: string
  image: string
  planPrompt: string
}

export interface Experience {
  id: string
  title: string
  blurb: string
  image: string
  planPrompt: string
}

// Unsplash images referenced remotely (see next.config images.remotePatterns).
const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`

export const destinations: Destination[] = [
  {
    id: 'rome',
    title: 'Rome',
    country: 'Italy',
    blurb: 'Ancient wonders, timeless piazzas, and the best carbonara of your life.',
    image: IMG('photo-1552832230-c0197dd311b5'),
    planPrompt: 'Plan a 4-day trip to Rome with must-see sights and great food.',
  },
  {
    id: 'lisbon',
    title: 'Lisbon',
    country: 'Portugal',
    blurb: 'Tiled facades, tram rides, and sunset views over the Tagus.',
    image: IMG('photo-1585208798174-6cedd86e019a'),
    planPrompt: 'Plan a 4-day trip to Lisbon with viewpoints, food, and a day trip.',
  },
  {
    id: 'kyoto',
    title: 'Kyoto',
    country: 'Japan',
    blurb: 'Temples, bamboo groves, and quiet gardens between the neon.',
    image: IMG('photo-1493976040374-85c8e12f0c0e'),
    planPrompt: 'Plan a 5-day trip to Kyoto with temples, gardens, and local food.',
  },
  {
    id: 'barcelona',
    title: 'Barcelona',
    country: 'Spain',
    blurb: 'Gaudí’s dreamscapes, beach afternoons, and late tapas nights.',
    image: IMG('photo-1583422409516-2895a77efded'),
    planPrompt: 'Plan a 4-day trip to Barcelona with Gaudí sights, beach time, and tapas.',
  },
  {
    id: 'ohrid',
    title: 'Ohrid',
    country: 'North Macedonia',
    blurb: 'A lakeside old town, hilltop churches, and slow summer evenings.',
    image: IMG('photo-1600298881974-6be191ceeda1'),
    planPrompt: 'Plan a 3-day trip to Ohrid with the old town, the lake, and viewpoints.',
  },
]

export const experiences: Experience[] = [
  {
    id: 'northern-lights',
    title: 'Chase the northern lights',
    blurb: 'A winter week under the aurora in Norwegian Lapland.',
    image: IMG('photo-1483347756197-71ef80e95f73'),
    planPrompt: 'Plan a 5-day northern lights trip to Tromsø, Norway in winter.',
  },
  {
    id: 'amalfi-drive',
    title: 'Drive the Amalfi Coast',
    blurb: 'Cliffside villages, lemon groves, and endless sea views.',
    image: IMG('photo-1533165850316-4dc8f0aa2c1c'),
    planPrompt: 'Plan a 5-day Amalfi Coast road trip with the best coastal towns.',
  },
  {
    id: 'safari',
    title: 'Go on safari',
    blurb: 'Dawn game drives and starlit camps in the Serengeti.',
    image: IMG('photo-1516426122078-c23e76319801'),
    planPrompt: 'Plan a 6-day safari in the Serengeti, Tanzania.',
  },
  {
    id: 'greek-islands',
    title: 'Island-hop the Cyclades',
    blurb: 'Whitewashed towns and ferry rides across the Aegean.',
    image: IMG('photo-1533105079780-92b9be482077'),
    planPrompt: 'Plan a 7-day Greek island-hopping trip through the Cyclades.',
  },
]

/** All landing items flattened — used for id-uniqueness checks and testing. */
export function allLandingItems(): { id: string }[] {
  return [...destinations, ...experiences]
}
