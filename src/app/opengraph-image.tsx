import { ImageResponse } from 'next/og'
import { LOGO_PATH } from '@/components/brand/Logo'

export const alt = 'Triperco — plan your whole trip in one conversation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * The card people actually see when a link is pasted into a chat.
 *
 * Drawn rather than shipped as a file, so it stays in step with the brand — the mark is the same
 * geometry as the app's, and the colours come from the same palette. No image asset to go stale.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F4F2EC',
          padding: '76px 84px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* The same geometry as the app's mark, imported rather than copied so it cannot drift. */}
          <svg width="76" height="76" viewBox="0 0 32 32" fill="#14213A">
            <path fillRule="evenodd" clipRule="evenodd" d={LOGO_PATH} />
          </svg>
          <div style={{ fontSize: 60, fontWeight: 800, color: '#14213A', letterSpacing: -2 }}>
            triperco
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/*
            Two lines as two flex children, not one div with a <br>. Satori requires an explicit
            display on any element with more than one child, and a line break counts as one.
          */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 68,
              fontWeight: 700,
              color: '#14213A',
              lineHeight: 1.1,
            }}
          >
            <div style={{ display: 'flex' }}>Plan the whole trip</div>
            <div style={{ display: 'flex' }}>in one conversation.</div>
          </div>
          <div style={{ fontSize: 30, color: '#6B7280', lineHeight: 1.4 }}>
            Real flights, stays and things to do — priced live, and yours to choose.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: '#6B7280', letterSpacing: 1 }}>
          Where your trip starts.
        </div>
      </div>
    ),
    size,
  )
}
