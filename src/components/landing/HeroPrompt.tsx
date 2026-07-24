'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HeroPrompt() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')

  return (
    <form
      role="form"
      onSubmit={(e) => {
        e.preventDefault()
        const q = prompt.trim()
        router.push(q ? `/plan?q=${encodeURIComponent(q)}` : '/plan')
      }}
      className="glass flex w-full max-w-xl items-center gap-2 p-2"
    >
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Where to? e.g. “A relaxed week in Japan”"
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-ink outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white shadow-md shadow-accent/25"
      >
        Plan it
      </button>
    </form>
  )
}
