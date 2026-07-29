'use client'

import { useEffect, useRef, useState } from 'react'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { Flight, Stay, Place, TripMeta } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { getResultSets } from '@/lib/ui/results'
import { revisionsFor, setId } from '@/lib/ui/revisions'
import { getOptionSets, getForms } from '@/lib/ui/interactions'
import { ResultCarousel } from '@/components/results/ResultCarousel'
import { MessageText } from './MessageText'
import { OptionList } from './OptionList'
import { PrefForm } from './PrefForm'
import { ThinkingIndicator, ResultSkeleton } from './ThinkingIndicator'

interface ChatPaneProps {
  messages: TriperUIMessage[]
  status: string
  /** Retained for callers; no longer rendered — suggestions come as guided cards in the thread. */
  suggestions?: string[]
  onSend: (text: string) => void
  onAddResult?: (set: ResultSet, item: Flight | Stay | Place) => void
  onOpenDetail?: (set: ResultSet, item: Flight | Stay | Place) => void
  /** So an event outside the trip window can say so on its card. */
  tripDates?: Pick<TripMeta, 'startDate' | 'endDate'>
  /** Rendered above the greeting when the chat is empty (e.g. starter prompts). */
  emptyState?: React.ReactNode
}

function messageText(message: TriperUIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

/** True while a tool call is running with nothing rendered yet for this turn. */
function isSearching(message: TriperUIMessage | undefined, busy: boolean): boolean {
  if (!busy || !message || message.role !== 'assistant') return false
  return getResultSets(message).length === 0 && messageText(message).length > 0
}

export function ChatPane({
  messages,
  status,
  onSend,
  onAddResult,
  onOpenDetail,
  tripDates,
  emptyState,
}: ChatPaneProps) {
  const [input, setInput] = useState('')
  const busy = status !== 'ready' && status !== 'error'
  const endRef = useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]
  // Which carousels have been answered again since, so only the live set stays open.
  const revisions = revisionsFor(messages)

  // Follow the conversation as it streams.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-1 pb-4">
        {messages.length === 0 && emptyState}

        {messages.map((m) => {
          const sets = m.role === 'assistant' ? getResultSets(m) : []
          const options = m.role === 'assistant' ? getOptionSets(m) : []
          const forms = m.role === 'assistant' ? getForms(m) : []
          const text = messageText(m)
          const isUser = m.role === 'user'

          return (
            <div
              key={m.id}
              className={
                'flex min-w-0 flex-col gap-3 ' + (isUser ? 'items-end' : 'items-start')
              }
            >
              {text && (
                <div
                  className={
                    isUser
                      ? 'max-w-[92%] break-words rounded-3xl rounded-br-lg bg-deep px-4 py-2.5 text-sm font-medium text-white sm:max-w-[85%]'
                      : 'max-w-full break-words text-[15px] font-medium text-ink sm:max-w-[92%]'
                  }
                >
                  <MessageText text={text} />
                </div>
              )}

              {sets.length > 0 && (
                <div className="w-full min-w-0">
                  {sets.map((set, i) => (
                    // Anchored so the section navigator can jump straight back here.
                    <div key={i} id={setId(m.id, i)} className="scroll-mt-4">
                      <ResultCarousel
                        set={set}
                        revision={revisions.get(setId(m.id, i))}
                        tripDates={tripDates}
                        onOpen={(s, item) => onOpenDetail?.(s, item)}
                        onAdd={(s, item) => onAddResult?.(s, item)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {options.map((set, i) => (
                <div key={`o${i}`} className="w-full max-w-md">
                  <OptionList set={set} onChoose={onSend} />
                </div>
              ))}

              {forms.map((form, i) => (
                <div key={`f${i}`} className="w-full max-w-md">
                  <PrefForm
                    form={form}
                    onSubmit={onSend}
                    onSkip={() => onSend("Let's skip that.")}
                  />
                </div>
              ))}
            </div>
          )
        })}

        {busy && (
          <div className="flex flex-col gap-2">
            <ThinkingIndicator label={isSearching(last, busy) ? 'Searching' : 'Thinking'} />
            {isSearching(last, busy) && <ResultSkeleton />}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/*
        No chips above the composer. Suggestions belong in the thread, as the guided cards the agent
        writes for the moment they apply — two competing sets of them just made the screen noisier.
      */}
      <div className="flex flex-col gap-2 border-t border-hairline pt-3">
        <form
          role="form"
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell Triperco what you want…"
            className="min-w-0 flex-1 rounded-2xl border border-hairline bg-white/70 px-3.5 py-3 text-base font-medium text-ink outline-none transition focus:border-accent/50 focus:bg-white placeholder:text-muted sm:px-4 sm:text-sm"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="shrink-0 rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white shadow-md shadow-accent/25 transition hover:bg-accent-600 disabled:opacity-40 sm:px-5"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
