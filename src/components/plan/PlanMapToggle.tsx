export type PlanView = 'plan' | 'map'

function ItineraryIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="5" cy="5.5" r="1.6" />
      <circle cx="5" cy="14.5" r="1.6" />
      <path d="M5 7.4v5.5" strokeLinecap="round" />
      <path d="M9.5 5.5h6M9.5 14.5h6M9.5 10h4" strokeLinecap="round" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M2.8 5.6 7.4 3.4v11.3L2.8 17V5.6Z" strokeLinejoin="round" />
      <path d="M7.4 3.4 12.6 5.9v11.2L7.4 14.7" strokeLinejoin="round" />
      <path d="M12.6 5.9 17.2 3.7v11.4l-4.6 2" strokeLinejoin="round" />
    </svg>
  )
}

export function PlanMapToggle({
  view,
  onChange,
}: {
  view: PlanView
  onChange: (view: PlanView) => void
}) {
  const seg = (value: PlanView, label: string, Icon: () => React.ReactElement) => {
    const active = view === value
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onChange(value)}
        className={
          'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ' +
          (active ? 'bg-deep text-white shadow-sm' : 'text-muted hover:text-ink')
        }
      >
        <Icon />
        {label}
      </button>
    )
  }

  return (
    <div className="inline-flex gap-1 rounded-2xl border border-hairline bg-white/60 p-1">
      {seg('plan', 'Itinerary', ItineraryIcon)}
      {seg('map', 'Map', MapIcon)}
    </div>
  )
}
