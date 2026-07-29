import { getDestinationPhoto } from '@/lib/searchapi/search'

export const maxDuration = 20

/** A cover photo for the plan hero. Cosmetic, so failures answer with null rather than an error. */
export async function POST(req: Request) {
  const { destination }: { destination?: string } = await req.json()
  if (!destination) return Response.json({ photo: null })
  try {
    return Response.json({ photo: await getDestinationPhoto(destination, undefined) })
  } catch {
    return Response.json({ photo: null })
  }
}
