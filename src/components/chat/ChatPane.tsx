'use client'

import { useEffect, useRef, useState } from 'react'
import type { TriperUIMessage } from '@/lib/ui/messages'
import type { Flight, Stay, Place, TripMeta } from '@/lib/trip/types'
import type { ResultSet } from '@/lib/ui/results'
import { getResultSets } from '@/lib/ui/results'
import { revisionsFor, setId } from '@/lib/ui/revisions'
import { SKIP_TEXT, type IntakeAnswer } from '@/lib/ui/intakeAnswers'
import {
  getOptionSets,
  getForms,
  getDetailRequests,
  getNotices,
  getRecaps,
  getSuggestions,
} from '@/lib/ui/interactions'
import { ResultCarousel } from '@/components/results/ResultCarousel'
import { MessageText } from './MessageText'
import { OptionList } from './OptionList'
import { PrefForm } from './PrefForm'
import { DetailForm } from './DetailForm'
import { SuggestionChips } from './SuggestionChips'
import { RecapCard } from './RecapCard'
import { ThinkingIndicator, ResultSkeleton } from './ThinkingIndicator'

interface ChatPaneProps {
  messages: TriperUIMessage[]
  status: string
  /**
   * Fallback next steps, derived from what the trip still needs. Used only when the agent did not
   * propose its own for this turn, so the traveler always has somewhere to go.
   */
  suggestions?: string[]
  onSend: (text: string) => void
  onAddResult?: (set: ResultSet, item: Flight | Stay | Place) => void
  onOpenDetail?: (set: ResultSet, item: Flight | Stay | Place) => void
  /** So an event outside the trip window can say so on its card. */
  tripDates?: Pick<TripMeta, 'startDate' | 'endDate'>
  /** Ids already in the plan, so a card can say so rather than inviting a second press. */
  plannedIds?: Set<string>
  /** Rendered above the greeting when the chat is empty (e.g. starter prompts). */
  emptyState?: React.ReactNode
  /** Opens the trip summary panel, for a recap written before the trip had a link. */
  onOpenSummary?: () => void
  /**
   * An answer to one of the guided cards, alongside the message it sends.
   *
   * The card knows which question it asked; prose does not. Reporting it lets the trip record the
   * answer itself instead of waiting for the model to — so a dropped `setTripMeta` cannot bring the
   * same calendar back on the next turn.
   */
  onIntakeAnswer?: (answer: IntakeAnswer) => void
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
  suggestions = [],
  onSend,
  onAddResult,
  onOpenDetail,
  tripDates,
  plannedIds,
  emptyState,
  onOpenSummary,
  onIntakeAnswer,
}: ChatPaneProps) {
  const [input, setInput] = useState('')
  const busy = status !== 'ready' && status !== 'error'
  const endRef = useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]
  // Which carousels have been answered again since, so only the live set stays open.
  const revisions = revisionsFor(messages)

  /*
   * Chips belong to the newest assistant turn only. The agent writes them for the moment it just
   * created — "Somewhere quieter" after stays, "Only nonstop" after flights — so carrying them down
   * the whole thread would offer the traveler four searches' worth of stale next steps at once.
   *
   * When the agent didn't propose any, the trip-derived fallback fills in, so a turn never ends
   * without a way forward.
   */
  const liveTurnId = last?.role === 'assistant' && !busy ? last.id : undefined
  const agentReplies = last?.role === 'assistant' ? getSuggestions(last) : []
  const liveReplies = agentReplies.length > 0 ? agentReplies : suggestions

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

  /**
   * A guided card's answer: reported as structured, then sent as the traveler's own words.
   *
   * Both halves matter. The structured half updates the trip immediately, so the brief closes whether
   * or not the model records it; the message keeps the transcript readable, because a plan that
   * silently changed under a conversation is one nobody can follow.
   */
  function answer(reported: IntakeAnswer) {
    onIntakeAnswer?.(reported)
    onSend(reported.text)
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {/*
        `overscroll-contain` is what stops reaching the top of the thread turning into the browser's
        pull-to-refresh, and stops a flick at the end of the conversation scrolling the page behind it.
      */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-contain px-1 pb-4">
        {messages.length === 0 && emptyState}

        {messages.map((m) => {
          const sets = m.role === 'assistant' ? getResultSets(m) : []
          const options = m.role === 'assistant' ? getOptionSets(m) : []
          const forms = m.role === 'assistant' ? getForms(m) : []
          const details = m.role === 'assistant' ? getDetailRequests(m) : []
          const notices = m.role === 'assistant' ? getNotices(m) : []
          const recaps = m.role === 'assistant' ? getRecaps(m) : []
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

              {/*
                Triperco's own voice, when the model's answer could not be shown. A recovered
                sentence reads as normal prose; an outright failure is marked, so it is never
                mistaken for trip information.
              */}
              {notices.map((notice, i) => (
                <div
                  key={`n${i}`}
                  data-testid="turn-notice"
                  data-kind={notice.kind}
                  className={
                    'max-w-full break-words text-[15px] sm:max-w-[92%] ' +
                    (notice.kind === 'failed' ? 'font-medium text-muted' : 'font-medium text-ink')
                  }
                >
                  <MessageText text={notice.text} />
                </div>
              ))}

              {sets.length > 0 && (
                <div className="w-full min-w-0">
                  {sets.map((set, i) => (
                    // Anchored so the section navigator can jump straight back here.
                    <div key={i} id={setId(m.id, i)} className="scroll-mt-4">
                      <ResultCarousel
                        set={set}
                        revision={revisions.get(setId(m.id, i))}
                        tripDates={tripDates}
                        plannedIds={plannedIds}
                        onOpen={(s, item) => onOpenDetail?.(s, item)}
                        onAdd={(s, item) => onAddResult?.(s, item)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* The end of the conversation: the whole trip in one place, with its link. */}
              {recaps.map((recap, i) => (
                <div key={`rc${i}`} className="w-full max-w-md">
                  <RecapCard recap={recap} onOpenSummary={onOpenSummary} />
                </div>
              ))}

              {options.map((set, i) => (
                <div key={`o${i}`} className="w-full max-w-md">
                  <OptionList set={set} onChoose={onSend} />
                </div>
              ))}

              {forms.map((form, i) => (
                <div key={`f${i}`} className="w-full max-w-md">
                  <PrefForm
                    form={form}
                    onSubmit={(text) => answer({ kind: 'form', intent: form.intent, text })}
                    onSkip={() => answer({ kind: 'form', intent: form.intent, text: SKIP_TEXT })}
                  />
                </div>
              ))}

              {details.map((request, i) => (
                <div key={`d${i}`} className="w-full max-w-md">
                  <DetailForm
                    request={request}
                    onSubmit={(text) => answer({ kind: 'detail', field: request.field, text })}
                    onSkip={() =>
                      answer({ kind: 'detail', field: request.field, text: SKIP_TEXT })
                    }
                  />
                </div>
              ))}

              {/*
                A guided card is already a question with its own answers, so chips beside one would
                offer two competing ways to reply to the same thing. A recap is the same in reverse:
                it is an ending, and the stage chips underneath it would invite the traveler to finish
                a trip they have just finished.
              */}
              {m.id === liveTurnId &&
                options.length === 0 &&
                forms.length === 0 &&
                details.length === 0 &&
                recaps.length === 0 && <SuggestionChips replies={liveReplies} onPick={onSend} />}
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
          {/*
            Locked while a turn is in flight. Typing into a composer that cannot send is a trap: the
            words look sent, the turn lands, and the half-written message is either lost or fires
            into a conversation that has already moved on.
          */}
          {/*
            16px on a phone, and not by accident: iOS zooms the whole page in on any input smaller
            than that, and then leaves it zoomed — which is how a chat ends up sideways mid-sentence.
          */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            aria-busy={busy}
            enterKeyHint="send"
            placeholder={busy ? 'Triperco is working…' : 'Tell Triperco what you want…'}
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-hairline bg-white/70 px-3.5 py-3 text-base font-medium text-ink outline-none transition focus:border-accent/50 focus:bg-white disabled:cursor-not-allowed disabled:bg-sand/50 disabled:text-muted placeholder:text-muted sm:px-4 sm:text-sm"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="min-h-12 shrink-0 rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white shadow-md shadow-accent/25 transition active:scale-[0.97] hover:bg-accent-600 disabled:opacity-40 sm:px-5"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
