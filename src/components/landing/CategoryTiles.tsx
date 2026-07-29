import Link from 'next/link'
import {
  StayIllustration,
  FlightIllustration,
  ThingsToDoIllustration,
  DestinationsIllustration,
} from './illustrations'

interface Category {
  label: string
  description: string
  prompt: string
  Illustration: () => React.ReactElement
}

const CATEGORIES: Category[] = [
  {
    label: 'Hotels & homes',
    description: 'Insightful recs just for you at unbeatable prices.',
    prompt: 'Help me find a great place to stay.',
    Illustration: StayIllustration,
  },
  {
    label: 'Flights',
    description: 'Every route compared, with the trade-offs spelled out.',
    prompt: 'Help me find flights for my trip.',
    Illustration: FlightIllustration,
  },
  {
    label: 'Things to do',
    description: 'What to see, do, and eat — perfectly planned.',
    prompt: 'Suggest things to do on my trip.',
    Illustration: ThingsToDoIllustration,
  },
  {
    label: 'Destinations',
    description: 'Describe a vibe and discover epic places & itineraries.',
    prompt: 'Help me choose where to go.',
    Illustration: DestinationsIllustration,
  },
]

export function CategoryTiles() {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-2 gap-5 sm:grid-cols-4">
      {CATEGORIES.map(({ label, description, prompt, Illustration }) => (
        <Link
          key={label}
          href={`/plan?q=${encodeURIComponent(prompt)}`}
          className="group flex flex-col gap-3"
        >
          <div className="aspect-square w-full overflow-hidden rounded-3xl bg-sand/60 p-7 transition group-hover:bg-sand">
            <div className="h-full w-full transition group-hover:scale-[1.04]">
              <Illustration />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-ink">{label}</div>
            <p className="mt-1 text-xs font-medium leading-relaxed text-muted">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
