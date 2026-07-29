'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

/**
 * Sends the summary to someone else.
 *
 * Two routes, in order of how well they work: the platform share sheet where it exists (phones,
 * Safari), which hands the link straight to Messages or Mail; and the clipboard everywhere else. We
 * never attach a file — the browser makes the PDF locally when they print, so there is nothing to
 * upload and nothing of theirs leaves the device unless they choose to send it.
 */
export function SummaryShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    const text = `${title} — planned with Triperco`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // Dismissed, or unavailable after all — fall through to the clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Nothing sensible left to try; the Print button still produces a file they can send.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      data-testid="share-summary"
      className="flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-sand"
    >
      <Icon name="users" className="h-3.5 w-3.5" />
      {copied ? 'Link copied' : 'Share'}
    </button>
  )
}
