import type { Metadata } from 'next'
import { inter, fraunces } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Triperco',
  description: 'AI trip planner — plan your whole trip in one chat.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} font-sans`}>{children}</body>
    </html>
  )
}
