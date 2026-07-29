export interface LegalSection {
  heading: string
  body: string[]
}

export interface LegalDocument {
  slug: string
  title: string
  summary: string
  updated: string
  sections: LegalSection[]
}

/**
 * The legal pages, written plainly.
 *
 * Two things shape all of this: Triperco never takes a booking or a payment, and it never holds a
 * reservation. Every one of these documents has to be honest about that, because it changes who the
 * traveler's contract is actually with when something goes wrong.
 */
const UPDATED = '29 July 2026'

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    summary: 'What Triperco does, what it does not do, and what you can expect from it.',
    updated: UPDATED,
    sections: [
      {
        heading: 'What Triperco is',
        body: [
          'Triperco is a travel planning assistant. You describe a trip in your own words and it searches live flight, accommodation and activity data, presents the options, and keeps the plan you build in one place.',
          'Triperco is a planning tool, not a travel agent and not a booking platform. It does not sell travel, take payment, hold reservations or issue tickets.',
        ],
      },
      {
        heading: 'Booking happens elsewhere',
        body: [
          'When you choose to book, Triperco sends you to the provider — the airline, the hotel, the rental host or the marketplace selling it. Your booking contract is with that provider and nobody else.',
          'Their terms, their cancellation policy and their refund rules apply. Your confirmation comes from them. If something goes wrong with a booking, they are who you deal with.',
        ],
      },
      {
        heading: 'Prices and availability',
        body: [
          'Every price shown is a snapshot of a search at a moment in time. Prices and availability change constantly, and the provider re-prices when you arrive on their site.',
          'Before you book, check that the dates, the airports and the number of travellers on the provider’s page match what you searched here. A different search returns a different price, and that difference is not an error on either side.',
          'We take no commission for ranking any option higher than another.',
        ],
      },
      {
        heading: 'What the assistant can get wrong',
        body: [
          'Triperco uses an AI model to interpret what you ask and to summarise what it finds. Models make mistakes. Times, durations, distances and descriptions can be wrong.',
          'Treat anything Triperco tells you as a starting point to verify, not as a guarantee — particularly anything that would cost you money or a day of your trip if it were wrong. Always confirm the details on the provider’s own page before booking.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Use Triperco to plan your own travel. Do not use it to scrape or resell the data it shows you, to overwhelm it with automated requests, or to attempt to break, probe or misuse the service.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'Triperco is provided as it is. To the extent the law allows, we are not liable for losses arising from bookings you make with providers, from prices or availability changing, or from mistakes in what the assistant tells you.',
          'Nothing here limits liability that cannot lawfully be limited.',
        ],
      },
      {
        heading: 'Changes',
        body: [
          'We may update these terms as the product changes. The date at the top of this page tells you when it last happened.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'What Triperco collects, why, and what it never does with it.',
    updated: UPDATED,
    sections: [
      {
        heading: 'What we collect',
        body: [
          'What you type into the chat, and the trip you build from it: where you want to go, your dates, how many people are travelling, and what you add to the plan.',
          'Basic technical information that any website receives, such as your browser type and approximate region, used to keep the service working.',
        ],
      },
      {
        heading: 'What we do with it',
        body: [
          'Your messages and your trip context are sent to the AI model that powers the assistant, and to the search providers we query, so that it can answer you with real options.',
          'That is the whole purpose. We do not sell your data, and we do not use it to build an advertising profile of you.',
        ],
      },
      {
        heading: 'What we ask you not to send',
        body: [
          'Do not put passport numbers, payment card details, passwords or other sensitive personal information into the chat. Triperco never needs them — you enter payment details on the provider’s own site, never here.',
        ],
      },
      {
        heading: 'Third parties',
        body: [
          'To find real options we query travel search providers, and we use an AI model provider to run the assistant. Each receives only what is needed to answer your request.',
          'When you follow a booking link you leave Triperco, and the provider’s own privacy policy applies from that point.',
        ],
      },
      {
        heading: 'Sharing a trip',
        body: [
          'If you share a trip, the itinerary at that link becomes visible to anyone who has it. Only the plan is shared — never your conversation. Do not share a trip that contains anything you would not want a stranger to read.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'Starting a new chat clears the trip you were building. You can ask us to delete data associated with you by writing to support@triperco.com.',
        ],
      },
    ],
  },
  {
    slug: 'website-terms',
    title: 'Website Terms of Use',
    summary: 'The rules for using this site and the content on it.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Using this site',
        body: [
          'You may use this site to plan travel for yourself and the people you are travelling with. You may not copy, scrape or republish its content, or access it through automated means without our written permission.',
        ],
      },
      {
        heading: 'Content and ownership',
        body: [
          'The Triperco name, mark and interface are ours. Flight, accommodation and activity information belongs to the providers it comes from and is shown here under their terms.',
          'Photographs are supplied by the providers and remain theirs.',
        ],
      },
      {
        heading: 'Links out',
        body: [
          'This site links to providers so you can book with them. We do not control those sites and are not responsible for their content, their availability or their terms.',
        ],
      },
      {
        heading: 'Availability',
        body: [
          'We do not promise the site will always be available or error-free. It depends on third-party search and AI services that can fail or change without notice.',
        ],
      },
      {
        heading: 'Getting in touch',
        body: [
          'Questions about this site go to support@triperco.com.',
        ],
      },
    ],
  },
]

export function legalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug)
}
