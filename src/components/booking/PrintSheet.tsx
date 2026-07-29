'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TripState } from '@/lib/trip/types'
import { TripSummarySheet } from './TripSummarySheet'

/**
 * The printable copy of the summary, rendered at the top of the document instead of inside the
 * modal.
 *
 * The on-screen sheet lives in a fixed, clipped, max-height dialog. A browser prints the document,
 * not the dialog, so that box produced a blank page however the print CSS was written. This puts a
 * plain, unclipped copy directly under <body>, hidden on screen and shown only to the printer.
 */
export function PrintSheet({ trip }: { trip: TripState }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div data-testid="print-sheet" className="print-sheet">
      <TripSummarySheet trip={trip} />
    </div>,
    document.body,
  )
}
