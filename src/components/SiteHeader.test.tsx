import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SiteHeader } from './SiteHeader'

describe('SiteHeader', () => {
  it('puts the logo on the left, linking home', () => {
    render(<SiteHeader />)
    expect(screen.getByRole('link', { name: /triperco — home/i })).toHaveAttribute('href', '/')
  })

  it('keeps the menu closed until asked', () => {
    render(<SiteHeader />)
    expect(screen.queryByTestId('menu-panel')).not.toBeInTheDocument()
  })

  it('offers a new chat from the menu', () => {
    const onNewChat = vi.fn()
    render(<SiteHeader onNewChat={onNewChat} />)
    fireEvent.click(screen.getByTestId('menu-button'))
    const item = screen.getByRole('menuitem', { name: /new chat/i })
    expect(item).toHaveAttribute('href', '/plan')
    fireEvent.click(item)
    expect(onNewChat).toHaveBeenCalled()
  })

  it('closes the menu on Escape', () => {
    render(<SiteHeader />)
    fireEvent.click(screen.getByTestId('menu-button'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('menu-panel')).not.toBeInTheDocument()
  })

  it('stays put while the page scrolls', () => {
    render(<SiteHeader />)
    expect(screen.getByTestId('site-header').className).toContain('sticky')
  })
})
