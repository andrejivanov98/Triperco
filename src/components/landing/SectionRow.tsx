import type { ReactNode } from 'react'
import { Heading } from '@/components/ui/Heading'

export function SectionRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Heading level={2} className="px-1 text-lg">
        {title}
      </Heading>
      <div className="flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  )
}
