'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Map as MlMap } from 'maplibre-gl'
import type { MapMarker } from '@/lib/ui/mapMarkers'

// Free, keyless vector tiles for dev/MVP. Swap for a keyed provider later.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

export function MapView({ markers }: { markers: MapMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let map: MlMap | undefined

    void (async () => {
      // maplibre-gl v6 is ESM named-exports only (no default export).
      const maplibregl = await import('maplibre-gl')
      if (cancelled || !container) return

      const first = markers[0]
      map = new maplibregl.Map({
        container,
        style: STYLE_URL,
        center: first ? [first.lng, first.lat] : [12.5, 41.9],
        zoom: first ? 11 : 3,
      })

      const bounds = new maplibregl.LngLatBounds()
      for (const m of markers) {
        new maplibregl.Marker()
          .setLngLat([m.lng, m.lat])
          .setPopup(new maplibregl.Popup({ offset: 24 }).setText(m.name))
          .addTo(map)
        bounds.extend([m.lng, m.lat])
      }
      if (markers.length > 1) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 13 })
      }
    })()

    return () => {
      cancelled = true
      if (map) map.remove()
    }
  }, [markers])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <div ref={containerRef} className="h-full w-full" />
      {markers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-400">
          Add places to your plan to see them on the map.
        </div>
      )}
    </div>
  )
}
