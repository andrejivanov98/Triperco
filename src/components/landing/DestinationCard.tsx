import Image from 'next/image'
import Link from 'next/link'
import type { Destination } from '@/lib/landing/content'

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={`/plan?q=${encodeURIComponent(destination.planPrompt)}`}
      className="glass group block w-64 shrink-0 overflow-hidden p-0"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={destination.image}
          alt={destination.title}
          fill
          sizes="256px"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-sky-600">
          {destination.country}
        </div>
        <div className="text-sm font-bold text-slate-900">{destination.title}</div>
        <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">
          {destination.blurb}
        </p>
      </div>
    </Link>
  )
}
