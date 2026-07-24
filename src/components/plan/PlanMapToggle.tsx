export type PlanView = 'plan' | 'map'

export function PlanMapToggle({
  view,
  onChange,
}: {
  view: PlanView
  onChange: (view: PlanView) => void
}) {
  const seg = (value: PlanView, label: string) => {
    const active = view === value
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onChange(value)}
        className={
          'rounded-xl px-4 py-1.5 text-xs font-semibold transition ' +
          (active ? 'bg-accent text-white shadow-md shadow-accent/25' : 'text-muted')
        }
      >
        {label}
      </button>
    )
  }

  return (
    <div className="inline-flex gap-1 rounded-2xl border border-hairline bg-white/60 p-1">
      {seg('plan', '📋 Plan')}
      {seg('map', '🗺 Map')}
    </div>
  )
}
