'use client'

import { useState } from 'react'
import type { PrefForm as PrefFormData } from '@/lib/ui/interactions'

export function PrefForm({
  form,
  onSubmit,
  onSkip,
}: {
  form: PrefFormData
  onSubmit: (text: string) => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(opt: string) {
    setSelected((cur) => (cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]))
  }

  return (
    <div className="glass flex flex-col gap-2 p-4">
      <div className="text-sm font-semibold text-ink">{form.question}</div>

      {form.mode === 'single' ? (
        <div className="flex flex-col">
          {form.options.map((o, i) => (
            <button
              key={`${o}-${i}`}
              type="button"
              onClick={() => onSubmit(o)}
              className="border-t border-hairline py-2.5 text-left text-sm font-medium text-ink first:border-t-0 hover:bg-accent-050"
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {form.options.map((o, i) => (
            <label key={`${o}-${i}`} className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
                className="h-4 w-4 accent-sky-500"
              />
              {o}
            </label>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <button type="button" onClick={onSkip} className="text-xs font-semibold text-muted">
          Skip
        </button>
        {form.mode === 'multi' && (
          <button
            type="button"
            onClick={() => onSubmit(selected.join(', '))}
            disabled={selected.length === 0}
            className="rounded-xl bg-deep px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
