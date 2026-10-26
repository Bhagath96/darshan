import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../utils/renderWithProviders'

describe('App shell', () => {
  it('renders the home page inside the main landmark', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('makes the skip link the first thing keyboard users reach', async () => {
    const { user } = renderApp()
    await screen.findByRole('heading', { level: 1 })
    await user.tab()
    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main-content')
  })

  it('shows a 404 page for unknown URLs, with a way home', async () => {
    renderApp({ url: '/no/such/page' })
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/')
  })
})
