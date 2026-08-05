import type { Metadata } from 'next'
import { inter, fraunces, jakarta } from './fonts'
import { siteUrl } from '@/lib/site'
import './globals.css'

const DESCRIPTION =
  'Describe the trip in your own words. Triperco finds the real flights, stays and things to do, and builds the plan as you chat.'

/**
 * metadataBase matters more than it looks: without it Next emits relative og:image URLs, which
 * every chat client ignores — so the link preview silently falls back to a bare URL.
 *
 * Deliberately no `alternates.canonical` here: a canonical set on the root layout is inherited by
 * every page that does not set its own, which would point the whole site at the homepage. Each
 * page declares its own instead.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Triperco — plan your whole trip in one conversation',
    template: '%s · Triperco',
  },
  description: DESCRIPTION,
  applicationName: 'Triperco',
  openGraph: {
    type: 'website',
    siteName: 'Triperco',
    title: 'Triperco — plan your whole trip in one conversation',
    description: DESCRIPTION,
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Triperco — plan your whole trip in one conversation',
    description: DESCRIPTION,
  },
  /*
   * The defaults are already index/follow; what earns this block is the preview budget. Without
   * max-image-preview:large Google shows a thumbnail barely wider than the text, and a travel result
   * with no picture is a travel result nobody clicks. max-snippet:-1 lifts the description cap.
   *
   * Setting robots here is safe for shared trips: Next resolves this field by replacing it outright
   * rather than merging, so /trip/[id] returning `robots: { index: false }` still wins on its pages.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  /*
   * Search Console's ownership check, which is what lets us submit the sitemap and see what Google
   * actually did with it. It reads a meta tag on the homepage, so it belongs on the root layout.
   *
   * From the environment rather than the source because it is per-property: the token ships in the
   * HTML of every page, so it is not a secret, but a repo is still the wrong place to pin one.
   * Absent, the key is omitted entirely — an empty content="" reads as a failed check.
   */
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} ${jakarta.variable} font-sans`}>{children}</body>
    </html>
  )
}
