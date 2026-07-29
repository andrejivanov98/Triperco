import { getStayDetails } from '@/lib/searchapi/search'
import { checkRateLimit, tooManyRequests } from '@/lib/rate/limit'

export const maxDuration = 20

interface Body {
  propertyToken?: string
  checkIn?: string
  checkOut?: string
  adults?: number
}

/** On-demand full property detail for the stay detail panel. Cached upstream. */
export async function POST(req: Request) {
  const limit = await checkRateLimit(req, 'lookup')
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  const { propertyToken, checkIn, checkOut, adults }: Body = await req.json()
  if (!propertyToken || !checkIn || !checkOut) {
    return Response.json({ error: 'propertyToken, checkIn and checkOut are required' }, { status: 400 })
  }
  try {
    const stay = await getStayDetails(
      { property_token: propertyToken, check_in_date: checkIn, check_out_date: checkOut, adults },
      undefined,
    )
    return Response.json({ stay })
  } catch {
    return Response.json({ stay: null })
  }
}
