import Image from 'next/image'
import Link from 'next/link'
import type { Experience } from '@/lib/landing/content'

export function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <Link
      href={`/plan?q=${encodeURIComponent(experience.planPrompt)}`}
      className="group relative block h-56 w-72 shrink-0 overflow-hidden rounded-[22px]"
    >
      <Image
        src={experience.image}
        alt={experience.title}
        fill
        sizes="288px"
        className="object-cover transition group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-deep/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="text-sm font-bold text-white">{experience.title}</div>
        <p className="mt-0.5 line-clamp-2 text-xs font-medium text-white/80">
          {experience.blurb}
        </p>
      </div>
    </Link>
  )
}
