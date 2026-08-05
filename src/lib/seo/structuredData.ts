import { siteUrl } from '@/lib/site'

/**
 * JSON-LD for the homepage.
 *
 * This is the machine-readable version of "what is Triperco" — the thing Google leans on to answer a
 * brand search with more than a blue link. Two nodes, linked by @id so they read as one graph: the
 * site itself, and the product it hosts.
 *
 * WebApplication rather than Organization is the honest description: there is no company story to
 * tell here, there is a tool you can use without an account, and the free-of-charge offer is a fact
 * worth stating in a form search engines can read.
 */
export function homepageStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Triperco',
        description:
          'Describe the trip in your own words. Triperco finds the real flights, stays and things to do, and builds the plan as you chat.',
        inLanguage: 'en',
      },
      {
        '@type': 'WebApplication',
        '@id': `${siteUrl}/#app`,
        name: 'Triperco',
        url: siteUrl,
        applicationCategory: 'TravelApplication',
        browserRequirements: 'Requires a modern web browser. No account needed.',
        isPartOf: { '@id': `${siteUrl}/#website` },
        description:
          'A travel planner you talk to. Describe a trip and Triperco searches live flights, stays and things to do, then builds the itinerary with you.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
          description: 'Free during early access.',
        },
      },
    ],
  }
}
