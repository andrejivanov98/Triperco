import type { OptionSet } from '@/lib/ui/interactions'
import { GuidedCard, GuidedRow } from './GuidedCard'

/** A guided menu: one clean row per choice, with room to answer in your own words instead. */
export function OptionList({ set, onChoose }: { set: OptionSet; onChoose: (prompt: string) => void }) {
  return (
    <GuidedCard
      title={set.question ?? 'What would you like to do next?'}
      onFreeText={onChoose}
      onSkip={() => onChoose("Let's skip that.")}
    >
      {set.options.map((option, i) => (
        <GuidedRow key={`${option.label}-${i}`} label={option.label} onClick={() => onChoose(option.prompt)} />
      ))}
    </GuidedCard>
  )
}
