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
          (active ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-600')
        }
      >
        {label}
      </button>
    )
  }

  return (
    <div className="inline-flex gap-1 rounded-2xl border border-white/60 bg-white/50 p-1">
      {seg('plan', '📋 Plan')}
      {seg('map', '🗺 Map')}
    </div>
  )
}
