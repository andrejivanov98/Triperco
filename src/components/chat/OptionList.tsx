import type { OptionSet } from '@/lib/ui/interactions'

export function OptionList({ set, onChoose }: { set: OptionSet; onChoose: (prompt: string) => void }) {
  return (
    <div className="glass overflow-hidden p-0">
      {set.question && (
        <div className="px-4 pt-3 pb-1 text-sm font-semibold text-ink">{set.question}</div>
      )}
      <div className="flex flex-col">
        {set.options.map((o, i) => (
          <button
            key={`${o.label}-${i}`}
            type="button"
            onClick={() => onChoose(o.prompt)}
            className="border-t border-hairline px-4 py-3 text-left text-sm font-medium text-ink first:border-t-0 hover:bg-accent-050"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
