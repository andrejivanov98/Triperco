import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareButton } from './ShareButton'

describe('ShareButton', () => {
  it('calls onShare when clicked', () => {
    const onShare = vi.fn()
    render(<ShareButton onShare={onShare} sharing={false} shareUrl={null} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    expect(onShare).toHaveBeenCalled()
  })

  it('shows the share URL once available', () => {
    render(<ShareButton onShare={() => {}} sharing={false} shareUrl="https://triperco.com/trip/abc" />)
    expect(screen.getByDisplayValue('https://triperco.com/trip/abc')).toBeInTheDocument()
  })

  it('disables the button while sharing', () => {
    render(<ShareButton onShare={() => {}} sharing={true} shareUrl={null} />)
    expect(screen.getByRole('button', { name: /sharing/i })).toBeDisabled()
  })
})
