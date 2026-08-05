import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

/**
 * Served at /robots.txt.
 *
 * Two paths are held back deliberately. /api/* is machinery with nothing for a reader. /trip/* is
 * someone's shared plan reached by an unguessable link — those pages still need to render rich
 * previews when pasted into a chat, so they are excluded here and marked noindex on the page
 * itself rather than hidden behind auth.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/trip/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
