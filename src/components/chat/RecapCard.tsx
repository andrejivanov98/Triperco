import type { TripRecapCard } from '@/lib/ui/interactions'
import { Icon } from '@/components/ui/Icon'

/**
 * The end of the conversation: the trip said back step by step, with the link to take away.
 *
 * A planning chat has no natural last turn, and without one the traveler is left scrolling back
 * through nine searches to work out what they actually ended up with. This is that answer, in one
 * place, in travel order — and the link is what turns it from a chat they will lose into something
 * they can send to the people coming with them.
 *
 * Every line comes from the plan itself. Nothing here is the model's prose, so nothing here can be
 * a price or a flight time that was never real.
 */
export function RecapCard({ recap, onOpenSummary }: { recap: TripRecapCard; onOpenSummary?: () => void }) {
  return (
    <div
      data-testid="trip-recap"
      className="w-full overflow-hidden rounded-[22px] border border-hairline bg-white/70 shadow-sm"
    >
      <div className="flex items-start gap-3 border-b border-hairline px-5 py-4">
        <span
          aria-hidden
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-050 text-accent-600"
        >
          <Icon name="check" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Your trip is planned
          </p>
          <p className="font-display text-lg leading-snug text-ink">{recap.title}</p>
          {recap.subtitle && (
            <p className="text-[13px] font-medium text-muted">{recap.subtitle}</p>
          )}
        </div>
      </div>

      <ol className="flex flex-col gap-2 px-5 py-4">
        {recap.steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] font-medium leading-relaxed text-ink">
            {/* Numbered, because this is an order of events and not a set of bullet points. */}
            <span
              aria-hidden
              className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sand text-[10px] font-bold text-muted"
            >
              {i + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>

      {recap.total && (
        <div className="flex items-baseline justify-between border-t border-hairline px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Trip total</span>
          <span className="text-base font-bold text-ink">{recap.total}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-5 py-3.5">
        {recap.url ? (
          <a
            href={recap.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-deep px-4 py-2.5 text-xs font-bold text-white transition active:scale-[0.97] hover:bg-ink"
          >
            Open the trip summary
            <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
          </a>
        ) : (
          onOpenSummary && (
            <button
              type="button"
              onClick={onOpenSummary}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-deep px-4 py-2.5 text-xs font-bold text-white transition active:scale-[0.97] hover:bg-ink"
            >
              Open the trip summary
              <Icon name="arrow-right" className="h-3.5 w-3.5" />
            </button>
          )
        )}
        {/*
          The address in full beside the button. This is the thing people paste into a group chat,
          and a link they cannot see is a link they cannot copy.
        */}
        {recap.url && (
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted">
            {recap.url}
          </span>
        )}
      </div>
    </div>
  )
}
