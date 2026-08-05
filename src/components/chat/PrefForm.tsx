'use client'

import { useState } from 'react'
import type { PrefForm as PrefFormData } from '@/lib/ui/interactions'
import { GuidedCard, GuidedRow } from './GuidedCard'
import { Icon } from '@/components/ui/Icon'

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

  function toggle(option: string) {
    setSelected((current) =>
      current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
    )
  }

  const multi = form.mode === 'multi'

  return (
    <GuidedCard
      title={form.question}
      onFreeText={onSubmit}
      onSkip={multi ? undefined : onSkip}
      footerRight={
        multi ? (
          <button
            type="button"
            onClick={() => onSubmit(selected.join(', '))}
            disabled={selected.length === 0}
            className="flex items-center gap-1.5 rounded-full bg-deep px-4 py-2 text-xs font-bold text-white transition hover:bg-ink disabled:opacity-40"
          >
            Next
            <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </button>
        ) : undefined
      }
    >
      {form.options.map((option, i) => (
        <GuidedRow
          key={`${option}-${i}`}
          label={option}
          showCheckbox={multi}
          selected={multi ? selected.includes(option) : undefined}
          onClick={() => (multi ? toggle(option) : onSubmit(option))}
        />
      ))}
    </GuidedCard>
  )
}
