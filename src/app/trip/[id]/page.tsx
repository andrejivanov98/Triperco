import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTripStore } from '@/lib/share/tripStore'
import { PlanView } from '@/components/plan/PlanView'

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trip = await getTripStore().load(id)
  if (!trip) notFound()

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold tracking-tight text-accent">✦ Triperco</div>
        <Link
          href={`/plan?from=${id}`}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-md shadow-accent/25"
        >
          Make it your own →
        </Link>
      </div>
      <div className="glass min-h-0 flex-1 p-4">
        <PlanView trip={trip} />
      </div>
    </main>
  )
}
