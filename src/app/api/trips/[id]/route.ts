import { getTripStore } from '@/lib/share/tripStore'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trip = await getTripStore().load(id)
  if (!trip) return new Response('Not found', { status: 404 })
  return Response.json(trip)
}
