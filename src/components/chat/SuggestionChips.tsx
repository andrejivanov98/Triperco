'use client'

/**
 * The next moves offered under the newest assistant turn. Tapping one sends it as the traveler's
 * own message, so a chip is never a special case for the agent to handle.
 *
 * Only the latest turn carries these. Leaving them on every message in the thread litters the
 * scrollback with stale offers — "Only nonstop" is meaningless four searches later.
 */
export function SuggestionChips({
  replies,
  onPick,
}: {
  replies: string[]
  onPick: (text: string) => void
}) {
  if (replies.length === 0) return null

  return (
    <div data-testid="suggestion-chips" className="flex flex-wrap gap-2">
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          onClick={() => onPick(reply)}
          className="rounded-full border border-hairline bg-white/70 px-3.5 py-2 text-xs font-semibold text-ink transition active:scale-[0.97] hover:border-accent/50 hover:bg-accent-050 hover:text-accent-600"
        >
          {reply}
        </button>
      ))}
    </div>
  )
}
