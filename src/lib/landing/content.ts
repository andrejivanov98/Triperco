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
  {
    id: 'istanbul',
    title: 'Istanbul',
    country: 'Türkiye',
    blurb: 'Two continents, domed skylines, and ferries at golden hour.',
    image: IMG('photo-1524231757912-21f4fe3a7200'),
    planPrompt: 'Plan a 4-day trip to Istanbul with the old city, bazaars, and Bosphorus time.',
  },
  {
    id: 'ljubljana',
    title: 'Ljubljana',
    country: 'Slovenia',
    blurb: 'A castle on the hill, riverside cafés, and Alps an hour away.',
    image: IMG('photo-1595867818082-083862f3d630'),
    planPrompt: 'Plan a long weekend in Ljubljana with the old town, the castle, and a lake day trip.',
  },
  {
    id: 'copenhagen',
    title: 'Copenhagen',
    country: 'Denmark',
    blurb: 'Harbour baths, design shops, and pastries worth the queue.',
    image: IMG('photo-1552560880-2482cef14240'),
    planPrompt: 'Plan a 4-day trip to Copenhagen with design, food, and canal time.',
  },
  {
    id: 'marrakech',
    title: 'Marrakech',
    country: 'Morocco',
    blurb: 'Souks, courtyard riads, and mint tea on every rooftop.',
    image: IMG('photo-1597212618440-806262de4f6b'),
    planPrompt: 'Plan a 4-day trip to Marrakech with the medina, riads, and a desert day.',
  },
  {
    id: 'tenerife',
    title: 'Tenerife',
    country: 'Spain',
    blurb: 'Volcanic peaks, black-sand coves, and winter sun.',
    image: IMG('photo-1591017403286-fd8493524e1e'),
    planPrompt: 'Plan a week in Tenerife with beaches, Teide, and good food.',
  },
  {
    id: 'edinburgh',
    title: 'Edinburgh',
    country: 'Scotland',
    blurb: 'Old-town closes, a volcano in the middle, and proper pubs.',
    image: IMG('photo-1506377585622-bfe3f2b8c8e0'),
    planPrompt: 'Plan a 3-day trip to Edinburgh with the old town, a hike, and whisky.',
  },
  {
    id: 'porto',
    title: 'Porto',
    country: 'Portugal',
    blurb: 'Port cellars, azulejo streets, and the Douro at dusk.',
    image: IMG('photo-1555881400-74d7acaacd8b'),
    planPrompt: 'Plan a 4-day trip to Porto with port tasting, the riverfront, and a Douro day.',
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
  {
    id: 'cherry-blossom',
    title: 'Catch cherry blossom season',
    blurb: 'Pink tunnels and park picnics across Japan in spring.',
    image: IMG('photo-1522383225653-ed111181a951'),
    planPrompt: 'Plan a 10-day cherry blossom trip through Japan in spring.',
  },
  {
    id: 'dolomites-hike',
    title: 'Hike the Dolomites',
    blurb: 'Limestone spires, mountain huts, and long alpine days.',
    image: IMG('photo-1464822759023-fed622ff2c3b'),
    planPrompt: 'Plan a 6-day hut-to-hut hiking trip in the Dolomites.',
  },
  {
    id: 'iceland-ring',
    title: 'Circle Iceland',
    blurb: 'Waterfalls, black beaches, and hot springs on the ring road.',
    image: IMG('photo-1504829857797-ddff29c27927'),
    planPrompt: 'Plan a 9-day Iceland ring road trip with hot springs and waterfalls.',
  },
  {
    id: 'morocco-desert',
    title: 'Sleep in the Sahara',
    blurb: 'Dune camps, camel trains, and a sky full of stars.',
    image: IMG('photo-1509316785289-025f5b846b35'),
    planPrompt: 'Plan a 5-day Morocco trip with a night in a Sahara desert camp.',
  },
  {
    id: 'vietnam-food',
    title: 'Eat across Vietnam',
    blurb: 'Street bowls from Hanoi to Saigon, with stops in between.',
    image: IMG('photo-1583417319070-4a69db38a482'),
    planPrompt: 'Plan a 12-day food-focused trip through Vietnam.',
  },
  {
    id: 'norway-fjords',
    title: 'Sail the Norwegian fjords',
    blurb: 'Sheer cliffs, quiet water, and villages at the end of the line.',
    image: IMG('photo-1601439678777-b2b3c56fa627'),
    planPrompt: 'Plan a 7-day Norwegian fjords trip with a scenic rail leg.',
  },
  {
    id: 'patagonia-trek',
    title: 'Trek Patagonia',
    blurb: 'Granite towers, glacier lakes, and famously big weather.',
    image: IMG('photo-1520250497591-112f2f40a3f4'),
    planPrompt: 'Plan a 10-day Patagonia trekking trip including Torres del Paine.',
  },
  {
    id: 'alps-ski',
    title: 'Ski the Alps',
    blurb: 'Long groomers, sun terraces, and a village to come home to.',
    image: IMG('photo-1551524559-8af4e6624178'),
    planPrompt: 'Plan a 7-day ski trip in the Alps for intermediate skiers.',
  },
]

/** Curated by mood rather than by fame — the "Places we love" row. */
export const lovedPlaces: Destination[] = [
  {
    id: 'oaxaca',
    title: 'Oaxaca',
    country: 'Mexico',
    blurb: 'The soul of Mexico, from mezcal-soaked valleys to the Pacific surf.',
    image: IMG('photo-1518105779142-d975f22f1b0a'),
    planPrompt: 'Plan a 6-day trip to Oaxaca with markets, mezcal, and food.',
  },
  {
    id: 'new-orleans',
    title: 'New Orleans',
    country: 'United States',
    blurb: 'Brass bands, hot beignets, and century-old live oaks.',
    image: IMG('photo-1571893544028-06b07af6dade'),
    planPrompt: 'Plan a long weekend in New Orleans with music, food, and the Garden District.',
  },
  {
    id: 'tofino',
    title: 'Tofino',
    country: 'Canada',
    blurb: 'Wild surf, ancient forests, and rugged Pacific edge beauty.',
    image: IMG('photo-1439066615861-d1af74d74000'),
    planPrompt: 'Plan a 5-day trip to Tofino with surfing, rainforest walks, and storm watching.',
  },
  {
    id: 'charleston',
    title: 'Charleston',
    country: 'United States',
    blurb: 'Cobblestone streets, Lowcountry flavors, and complex American history.',
    image: IMG('photo-1595859703065-2259ca1bcb4c'),
    planPrompt: 'Plan a 4-day trip to Charleston with historic streets and Lowcountry food.',
  },
  {
    id: 'marfa',
    title: 'Marfa',
    country: 'United States',
    blurb: 'Minimalist art and rugged ranching in the high desert.',
    image: IMG('photo-1500648767791-00dcc994a43e'),
    planPrompt: 'Plan a 4-day trip to Marfa with art installations and desert drives.',
  },
  {
    id: 'mexico-city',
    title: 'Mexico City',
    country: 'Mexico',
    blurb: 'Ancient history and culinary innovation at high altitude.',
    image: IMG('photo-1518659526054-190340b32735'),
    planPrompt: 'Plan a 5-day trip to Mexico City with museums, markets, and great food.',
  },
  {
    id: 'portland',
    title: 'Portland',
    country: 'United States',
    blurb: 'Bookshops, food carts, and forest trails inside the city.',
    image: IMG('photo-1541457523724-ed5b8e56e0bc'),
    planPrompt: 'Plan a 4-day trip to Portland with food, coffee, and a gorge day trip.',
  },
  {
    id: 'san-sebastian',
    title: 'San Sebastián',
    country: 'Spain',
    blurb: 'Pintxos bar crawls between two perfect city beaches.',
    image: IMG('photo-1562883676-8c7feb83f09b'),
    planPrompt: 'Plan a 4-day trip to San Sebastián built around pintxos and beaches.',
  },
  {
    id: 'hoi-an',
    title: 'Hoi An',
    country: 'Vietnam',
    blurb: 'Lantern-lit lanes, tailor shops, and rice fields on the edge.',
    image: IMG('photo-1559592413-7cec4d0cae2b'),
    planPrompt: 'Plan a 5-day trip to Hoi An with the old town, food, and a cooking class.',
  },
  {
    id: 'valparaiso',
    title: 'Valparaíso',
    country: 'Chile',
    blurb: 'Hillside murals, funiculars, and Pacific fog rolling in.',
    image: IMG('photo-1596395819057-e37f9b3d95d5'),
    planPrompt: 'Plan a 4-day trip to Valparaíso with street art, funiculars, and wine.',
  },
  {
    id: 'kotor',
    title: 'Kotor',
    country: 'Montenegro',
    blurb: 'A walled town at the head of a fjord-like bay.',
    image: IMG('photo-1601649949919-2ec7ad9b8daf'),
    planPrompt: 'Plan a 4-day trip to Kotor with the bay, the fortress climb, and nearby beaches.',
  },
  {
    id: 'tbilisi',
    title: 'Tbilisi',
    country: 'Georgia',
    blurb: 'Sulphur baths, balconied old streets, and very good wine.',
    image: IMG('photo-1565008576549-57ea3ac7b5d9'),
    planPrompt: 'Plan a 5-day trip to Tbilisi with the old town, wine country, and mountains.',
  },
]

/** All landing items flattened — used for id-uniqueness checks and testing. */
export function allLandingItems(): { id: string }[] {
  return [...destinations, ...experiences, ...lovedPlaces]
}
