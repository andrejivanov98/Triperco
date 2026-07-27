/** Shown while a turn is in flight so a long search never looks like a hang. */
export function ThinkingIndicator({ label = 'Working on it' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-1 py-1 text-sm font-medium text-muted"
    >
      <span className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      {label}
    </div>
  )
}

/** Placeholder cards while results stream in. */
export function ResultSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden pb-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass h-44 w-56 shrink-0 animate-pulse p-0">
          <div className="h-28 w-full rounded-t-[19px] bg-sand" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-3 w-3/4 rounded bg-sand" />
            <div className="h-3 w-1/2 rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  )
}
