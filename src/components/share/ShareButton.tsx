'use client'

interface ShareButtonProps {
  onShare: () => void
  sharing: boolean
  shareUrl: string | null
}

export function ShareButton({ onShare, sharing, shareUrl }: ShareButtonProps) {
  if (shareUrl) {
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-slate-700"
        />
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(shareUrl)}
          className="shrink-0 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white"
        >
          Copy
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={sharing}
      className="rounded-xl border border-sky-200 bg-sky-100/70 px-3 py-1.5 text-xs font-semibold text-sky-700 disabled:opacity-50"
    >
      {sharing ? 'Sharing…' : 'Share trip'}
    </button>
  )
}
