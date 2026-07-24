import type { Watchout } from '@/lib/trip/watchouts'

export function WatchoutBanner({
  watchouts,
  onFix,
}: {
  watchouts: Watchout[]
  onFix?: (prompt: string) => void
}) {
  if (watchouts.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {watchouts.map((w) => (
        <div
          key={w.id}
          className={
            'rounded-2xl border px-3 py-2 text-xs font-medium ' +
            (w.severity === 'warning'
              ? 'border-amber-300/70 bg-amber-50 text-amber-900'
              : 'border-accent/30 bg-accent-050 text-ink')
          }
        >
          <div className="flex items-start gap-2">
            <span aria-hidden>{w.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>{w.message}</span>
          </div>
          {w.fixes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {w.fixes.map((f) =>
                onFix ? (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => onFix(f.prompt)}
                    className="rounded-full border border-hairline bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-white"
                  >
                    {f.label}
                  </button>
                ) : (
                  <span
                    key={f.label}
                    className="rounded-full border border-hairline bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-ink"
                  >
                    {f.label}
                  </span>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
