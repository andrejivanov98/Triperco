import type { ReactNode } from 'react'

type Level = 1 | 2 | 3

export function Heading({
  level = 2,
  className = '',
  children,
}: {
  level?: Level
  className?: string
  children: ReactNode
}) {
  const Tag = (`h${level}` as const) as 'h1' | 'h2' | 'h3'
  return (
    <Tag className={`font-display font-semibold tracking-tight text-ink ${className}`.trim()}>
      {children}
    </Tag>
  )
}
