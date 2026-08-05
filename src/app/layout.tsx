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
