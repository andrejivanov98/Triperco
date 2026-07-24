import type { ReactNode } from 'react'

export function SectionRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-lg font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  )
}
