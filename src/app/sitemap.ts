import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents'

/**
 * Served at /sitemap.xml — every page worth a crawl, and nothing else.
 *
 * Shared trips are absent on purpose: they are private links, not public pages. Listing them in a
 * sitemap would be handing Google a directory of them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/plan`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...LEGAL_DOCUMENTS.map((doc) => ({
      url: `${siteUrl}/legal/${doc.slug}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ]
}
