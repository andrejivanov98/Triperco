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
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-white/60 px-3 py-1.5 text-xs font-medium text-ink"
        />
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(shareUrl)}
          className="shrink-0 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white"
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
      className="rounded-xl border border-accent/30 bg-accent-050 px-3 py-1.5 text-xs font-semibold text-accent-600 disabled:opacity-50"
    >
      {sharing ? 'Sharing…' : 'Share trip'}
    </button>
  )
}
