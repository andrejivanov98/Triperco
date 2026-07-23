'use client'

import { useState } from 'react'
import type { TriperUIMessage } from '@/lib/ui/messages'

interface ChatPaneProps {
  messages: TriperUIMessage[]
  status: string
  suggestions: string[]
  onSend: (text: string) => void
}

function messageText(message: TriperUIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function ChatPane({ messages, status, suggestions, onSend }: ChatPaneProps) {
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
      <div className="mb-3 text-sm font-bold tracking-tight text-sky-600">✦ Triperco</div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'ml-6 rounded-2xl border border-sky-200 bg-sky-100/70 px-3 py-2 text-sm font-medium text-sky-900'
                : 'rounded-2xl border border-white/60 bg-white/50 px-3 py-2 text-sm font-medium text-slate-800'
            }
          >
            {messageText(m)}
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              disabled={busy}
              className="rounded-full border border-sky-200 bg-sky-100/70 px-3 py-1.5 text-xs font-semibold text-sky-700 disabled:opacity-50"
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
          className="flex-1 rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/30 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
