import Image from 'next/image'
import Link from 'next/link'
import type { Destination } from '@/lib/landing/content'

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={`/plan?q=${encodeURIComponent(destination.planPrompt)}`}
      className="group block w-[268px] shrink-0 snap-start"
    >
      <div className="relative h-48 w-full overflow-hidden rounded-[20px]">
        <Image
          src={destination.image}
          alt={destination.title}
          fill
          sizes="268px"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="pt-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-accent">
          {destination.country}
        </div>
        <div className="text-base font-bold text-ink">{destination.title}</div>
        <p className="mt-1 line-clamp-3 text-sm font-medium leading-relaxed text-muted">
          {destination.blurb}
        </p>
      </div>
    </Link>
  )
}
