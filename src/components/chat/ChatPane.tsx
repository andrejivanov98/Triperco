'use client'

import { useState } from 'react'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { Flight, Stay, Place } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { getResultSets } from '@/lib/ui/results'
import { ResultCarousel } from '@/components/results/ResultCarousel'

interface ChatPaneProps {
  messages: TriperUIMessage[]
  status: string
  suggestions: string[]
  onSend: (text: string) => void
  onAddResult?: (set: ResultSet, item: Flight | Stay | Place) => void
  onOpenDetail?: (set: ResultSet, item: Flight | Stay | Place) => void
}

function messageText(message: TriperUIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function ChatPane({
  messages,
  status,
  suggestions,
  onSend,
  onAddResult,
  onOpenDetail,
}: ChatPaneProps) {
  const [input, setInput] = useState('')
  const busy = status !== 'ready'

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  return (
    <div className="glass flex h-full flex-col p-4">
      <div className="mb-3 text-sm font-bold tracking-tight text-accent">✦ Triperco</div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {messages.map((m) => {
          const sets = m.role === 'assistant' ? getResultSets(m) : []
          const text = messageText(m)
          return (
            <div key={m.id} className="flex flex-col gap-2">
              {text && (
                <div
                  className={
                    m.role === 'user'
                      ? 'ml-6 rounded-2xl border border-hairline bg-sand px-3 py-2 text-sm font-medium text-ink'
                      : 'rounded-2xl border border-hairline bg-white/60 px-3 py-2 text-sm font-medium text-ink'
                  }
                >
                  {text}
                </div>
              )}
              {sets.map((set, i) => (
                <ResultCarousel
                  key={i}
                  set={set}
                  onOpen={(s, item) => onOpenDetail?.(s, item)}
                  onAdd={(s, item) => onAddResult?.(s, item)}
                />
              ))}
            </div>
          )
        })}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              disabled={busy}
              className="rounded-full border border-accent/30 bg-accent-050 px-3 py-1.5 text-xs font-semibold text-accent-600 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        role="form"
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your trip…"
          className="flex-1 rounded-xl border border-hairline bg-white/60 px-3 py-2 text-sm font-medium text-ink outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-md shadow-accent/25 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
