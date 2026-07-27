import type { OptionSet } from '@/lib/ui/interactions'

/** A guided menu: one clean row per choice, chevron on the right. */
export function OptionList({ set, onChoose }: { set: OptionSet; onChoose: (prompt: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {set.question && <div className="text-[15px] font-medium text-ink">{set.question}</div>}
      <div className="overflow-hidden rounded-2xl border border-hairline bg-white/50">
        {set.options.map((o, i) => (
          <button
            key={`${o.label}-${i}`}
            type="button"
            onClick={() => onChoose(o.prompt)}
            className="group flex w-full items-center justify-between gap-3 border-t border-hairline px-4 py-3.5 text-left transition first:border-t-0 hover:bg-accent-050"
          >
            <span className="text-sm font-medium text-ink">{o.label}</span>
            <span
              aria-hidden="true"
              className="shrink-0 text-sm font-semibold text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
            >
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
