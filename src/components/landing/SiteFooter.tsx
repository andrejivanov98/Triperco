import Link from 'next/link'
import { LogoMark } from '@/components/brand/Logo'

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Travel',
    links: [
      { label: 'Start a trip', href: '/plan' },
      { label: 'Flights', href: '/plan?intent=flights' },
      { label: 'Stays', href: '/plan?intent=stays' },
      { label: 'Things to do', href: '/plan?intent=activities' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Our mission', href: '/#mission' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Contact support', href: 'mailto:support@triperco.com' },
      { label: 'Send feedback', href: 'mailto:feedback@triperco.com' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Website Terms of Use', href: '/legal/website-terms' },
    ],
  },
]

/** The closing band: what we are, where to go next, and the small print. */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-hairline bg-sand/30">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Triperco</p>
            <p className="font-display text-xl leading-snug text-ink">Where your trip starts.</p>
            <p className="mt-1 text-xs font-medium text-muted">
              © {new Date().getFullYear()} Triperco.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                {column.heading}
              </p>
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-ink/80 transition hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <p className="mt-12 max-w-3xl text-[11px] font-medium leading-relaxed text-muted">
          Triperco searches live prices and hands you off to the provider to book. We are not
          affiliated with any airline, hotel or booking site, we take no commission for ranking
          anything higher, and prices shown are as of your search — the provider&apos;s own site is
          the only live source.
        </p>
      </div>

      {/* The mark in full, as a closing flourish — cropping your own logo is a strange thing to do. */}
      <div className="flex justify-center pb-12" aria-hidden="true">
        <LogoMark className="h-28 w-28 text-deep/15" />
      </div>
    </footer>
  )
}
