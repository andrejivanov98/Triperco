/** A short reason to pick this option ("Best value", "Cheapest", "24% less than usual"). */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' }) {
  const styles =
    tone === 'accent'
      ? 'bg-accent text-white'
      : 'bg-white/70 text-ink border border-hairline'
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles}`}
    >
      {label}
    </span>
  )
}

/** The badge we treat as our recommendation gets the accent fill; the rest stay quiet. */
export function badgeTone(label: string): 'neutral' | 'accent' {
  return label === 'Best value' ? 'accent' : 'neutral'
}
