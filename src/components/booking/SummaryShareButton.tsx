'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

/** Where the summary already lives at its own address, so re-saving it would be pointless. */
function alreadyShared(): boolean {
  return window.location.pathname.startsWith('/trip/')
}

/**
 * Sends the summary to someone else — most often a partner travelling with them.
 *
 * It has to save the trip first. This used to share `window.location.href`, which from the planner is
 * `/plan?plan=open`: the recipient opened an empty planner and saw none of the trip. Saving it gives
 * the summary a page of its own, which renders this same sheet with every address linked.
 *
 * Then two routes, in order of how well they work: the platform share sheet where it exists (phones,
 * Safari), which hands the link straight to Messages or WhatsApp; and the clipboard everywhere else.
 * No file is ever attached — the browser makes the PDF locally when they print, so nothing of theirs
 * leaves the device unless they choose to send it.
 */
export function SummaryShareButton({
  title,
  onCreateLink,
}: {
  title: string
  /** Saves the trip and resolves to its shareable url. Absent on a page that is already one. */
  onCreateLink?: () => Promise<string | null>
}) {
  const [state, setState] = useState<'idle' | 'working' | 'copied' | 'failed'>('idle')

  async function share() {
    setState('working')
    let url = window.location.href

    if (!alreadyShared() && onCreateLink) {
      const created = await onCreateLink()
      if (!created) {
        // Say so, rather than silently sharing a link to an empty planner.
        setState('failed')
        setTimeout(() => setState('idle'), 2500)
        return
      }
      url = created
    }

    const text = `${title} — planned with Triperco`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        setState('idle')
        return
      } catch {
        // Dismissed, or unavailable after all — fall through to the clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      // Nothing sensible left to try; the Print button still produces a file they can send.
      setState('idle')
    }
  }

  const label =
    state === 'working'
      ? 'Saving…'
      : state === 'copied'
        ? 'Link copied'
        : state === 'failed'
          ? 'Could not save'
          : 'Share'

  return (
    <button
      type="button"
      onClick={share}
      disabled={state === 'working'}
      data-testid="share-summary"
      className="flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-sand disabled:opacity-50"
    >
      <Icon name="users" className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
