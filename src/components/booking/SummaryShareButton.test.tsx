import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SummaryShareButton } from './SummaryShareButton'

/** Point the page at a url without navigating, which jsdom will not do. */
function setPath(pathname: string) {
  window.history.replaceState({}, '', pathname)
}

/** Records what was copied. Capturing the argument beats reading it back off the mock's tuple type. */
function stubClipboard() {
  const copied: string[] = []
  const writeText = vi.fn(async (text: string) => {
    copied.push(text)
  })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return { writeText, copied }
}

afterEach(() => {
  vi.unstubAllGlobals()
  setPath('/')
})

/**
 * This used to share `window.location.href`, which from the planner is `/plan?plan=open`. The
 * recipient opened an empty planner and saw none of the trip — the one thing the button exists to do.
 */
describe('SummaryShareButton — from the planner', () => {
  it('saves the trip and shares the link to it, not the planner url', async () => {
    setPath('/plan?plan=open')
    const { writeText, copied } = stubClipboard()
    const onCreateLink = vi.fn(async () => 'https://triperco.test/trip/abc')

    render(<SummaryShareButton title="Rome Getaway" onCreateLink={onCreateLink} />)
    fireEvent.click(screen.getByTestId('share-summary'))

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(onCreateLink).toHaveBeenCalledTimes(1)
    expect(copied[0]).toContain('https://triperco.test/trip/abc')
    expect(copied[0]).not.toContain('plan=open')
  })

  it('confirms the link was copied', async () => {
    setPath('/plan')
    stubClipboard()
    render(
      <SummaryShareButton title="Rome" onCreateLink={async () => 'https://t.test/trip/a'} />,
    )
    fireEvent.click(screen.getByTestId('share-summary'))
    await waitFor(() => expect(screen.getByTestId('share-summary')).toHaveTextContent(/link copied/i))
  })

  it('says it could not save rather than sharing a useless link', async () => {
    setPath('/plan')
    const { writeText } = stubClipboard()
    render(<SummaryShareButton title="Rome" onCreateLink={async () => null} />)
    fireEvent.click(screen.getByTestId('share-summary'))

    await waitFor(() => expect(screen.getByTestId('share-summary')).toHaveTextContent(/could not save/i))
    expect(writeText).not.toHaveBeenCalled()
  })

  it('prefers the platform share sheet when the phone has one', async () => {
    setPath('/plan')
    const shared: { url?: string }[] = []
    const nativeShare = vi.fn(async (data: { url?: string }) => {
      shared.push(data)
    })
    Object.defineProperty(navigator, 'share', { value: nativeShare, configurable: true })
    const { writeText } = stubClipboard()

    render(<SummaryShareButton title="Rome" onCreateLink={async () => 'https://t.test/trip/a'} />)
    fireEvent.click(screen.getByTestId('share-summary'))

    await waitFor(() => expect(nativeShare).toHaveBeenCalled())
    expect(shared[0]).toMatchObject({ url: 'https://t.test/trip/a' })
    expect(writeText).not.toHaveBeenCalled()
    Reflect.deleteProperty(navigator, 'share')
  })
})

describe('SummaryShareButton — from a page that is already shared', () => {
  it('passes the current link along without saving a second copy', async () => {
    setPath('/trip/abc')
    const { writeText, copied } = stubClipboard()
    const onCreateLink = vi.fn(async () => 'https://should-not-be-called.test')

    render(<SummaryShareButton title="Rome" onCreateLink={onCreateLink} />)
    fireEvent.click(screen.getByTestId('share-summary'))

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(onCreateLink).not.toHaveBeenCalled()
    expect(copied[0]).toContain('/trip/abc')
  })

  it('works with no save callback at all', async () => {
    setPath('/trip/abc')
    const { writeText } = stubClipboard()
    render(<SummaryShareButton title="Rome" />)
    fireEvent.click(screen.getByTestId('share-summary'))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
  })
})
