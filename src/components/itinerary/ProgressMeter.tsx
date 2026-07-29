import type { TripState } from '@/lib/trip/types'
import { tripProgress, nextGapPrompt } from '@/lib/trip/progress'

/**
 * What is still missing, and one tap to go and get it.
 *
 * An empty plan panel used to say nothing useful, leaving the traveler to guess what a finished trip
 * even looks like. This names the three things and counts them off.
 */
export function ProgressMeter({
  trip,
  onAsk,
}: {
  trip: TripState
  /** Sends the prompt that closes the first gap into the chat. */
  onAsk?: (prompt: string) => void
}) {
  const { steps, added, target, complete } = tripProgress(trip)
  const prompt = nextGapPrompt(trip)

  return (
    <div data-testid="progress-meter" className="flex flex-col gap-2 rounded-2xl border border-hairline bg-white/50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          {complete ? 'Trip covered' : 'Still to sort'}
        </span>
        <span className="text-xs font-bold text-ink">
          {added} of {target}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2 text-xs font-semibold">
            <span
              aria-hidden
              className={
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ' +
                (step.done ? 'bg-accent text-white' : 'border border-hairline bg-white text-muted')
              }
            >
              {step.done ? '✓' : ''}
            </span>
            <span className={step.done ? 'text-muted line-through' : 'text-ink'}>{step.label}</span>
            {step.target > 1 && (
              <span className="ml-auto text-[11px] font-medium text-muted">
                {step.added}/{step.target}
              </span>
            )}
          </li>
        ))}
      </ul>

      {prompt && onAsk && (
        <button
          type="button"
          onClick={() => onAsk(prompt)}
          className="mt-0.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white transition hover:bg-accent-600"
        >
          {prompt}
        </button>
      )}
    </div>
  )
}
