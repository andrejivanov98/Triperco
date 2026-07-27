import { parseChatText, type ChatSpan } from '@/lib/ui/chatText'

function Spans({ spans }: { spans: ChatSpan[] }) {
  return (
    <>
      {spans.map((s, i) =>
        s.strong ? (
          <strong key={i} className="font-semibold">
            {s.text}
          </strong>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  )
}

/** Assistant/user prose. Markdown markers are parsed away so they never render literally. */
export function MessageText({ text }: { text: string }) {
  const blocks = parseChatText(text)
  if (blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) =>
        block.type === 'bullets' ? (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
            {block.items?.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="leading-relaxed">
            <Spans spans={block.spans} />
          </p>
        ),
      )}
    </div>
  )
}
