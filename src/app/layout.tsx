import type { Metadata } from 'next'
import { inter, fraunces, jakarta } from './fonts'
import './globals.css'

const DESCRIPTION =
  'Describe the trip in your own words. Triperco finds the real flights, stays and things to do, and builds the plan as you chat.'

/**
 * metadataBase matters more than it looks: without it Next emits relative og:image URLs, which
 * every chat client ignores — so the link preview silently falls back to a bare URL. It reads the
 * Vercel-provided host in production and localhost in dev, so previews work in both.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? `https://${process.env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, '')}`
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000'

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
