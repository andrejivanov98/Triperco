import { describe, it, expect } from 'vitest'
import robots from './robots'
import sitemap from './sitemap'
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents'
import { homepageStructuredData } from '@/lib/seo/structuredData'

describe('robots.txt', () => {
  const rules = () => {
    const rule = robots().rules
    return Array.isArray(rule) ? rule[0] : rule
  }

  it('lets crawlers reach the site', () => {
    expect(rules().allow).toBe('/')
  })

  it('holds back the API and shared trips', () => {
    expect(rules().disallow).toEqual(['/api/', '/trip/'])
  })

  it('points at an absolute sitemap URL, which is the only kind Google accepts', () => {
    expect(robots().sitemap).toMatch(/^https?:\/\/.+\/sitemap\.xml$/)
  })
})

describe('sitemap.xml', () => {
  const urls = () => sitemap().map((entry) => entry.url)

  it('lists the homepage and the planner', () => {
    const paths = urls().map((url) => new URL(url).pathname)
    expect(paths).toContain('/')
    expect(paths).toContain('/plan')
  })

  it('lists every legal document, so none of them drifts out of the sitemap unnoticed', () => {
    const paths = urls().map((url) => new URL(url).pathname)
    for (const doc of LEGAL_DOCUMENTS) {
      expect(paths).toContain(`/legal/${doc.slug}`)
    }
  })

  it('never lists a shared trip', () => {
    expect(urls().some((url) => url.includes('/trip/'))).toBe(false)
  })

  it('uses absolute URLs throughout', () => {
    for (const url of urls()) expect(() => new URL(url)).not.toThrow()
  })
})

describe('homepage structured data', () => {
  it('describes the site and the app as one linked graph', () => {
    const graph = homepageStructuredData()['@graph']
    const site = graph.find((node) => node['@type'] === 'WebSite')
    const app = graph.find((node) => node['@type'] === 'WebApplication')

    expect(site).toBeDefined()
    expect(app).toBeDefined()
    // The link is the point: an unlinked app node tells Google nothing about whose app it is.
    expect((app as { isPartOf: { '@id': string } }).isPartOf['@id']).toBe(
      (site as { '@id': string })['@id'],
    )
  })

  it('serialises to valid JSON, since a broken ld+json block is silently ignored', () => {
    expect(() => JSON.parse(JSON.stringify(homepageStructuredData()))).not.toThrow()
  })
})
