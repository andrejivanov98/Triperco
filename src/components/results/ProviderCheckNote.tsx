import { Icon } from '@/components/ui/Icon'

/**
 * The honest caveat, shown where the decision is made rather than buried at checkout.
 *
 * What we show is a snapshot of a search, and the provider re-prices live. If the traveler lands on
 * the provider with different dates or a different party, they will see a different number and
 * assume we were wrong — so say plainly that the search has to match.
 */
export function ProviderCheckNote({
  kind,
  className = '',
}: {
  kind: 'flights' | 'stays'
  className?: string
}) {
  const what = kind === 'flights' ? 'Fares' : 'Rates'
  const match =
    kind === 'flights'
      ? 'the same dates, airports and passengers'
      : 'the same dates, guests and rooms'

  return (
    <p
      data-testid="provider-check-note"
      className={
        'flex items-start gap-2 rounded-xl border border-hairline bg-sand/50 px-3 py-2 text-[11px] font-medium leading-relaxed text-muted ' +
        className
      }
    >
      <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {what} are as of this search and can change. Check {match} are set on the provider&apos;s
        site before booking — availability and the final price are theirs, not ours.
      </span>
    </p>
  )
}
