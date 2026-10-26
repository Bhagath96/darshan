import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { failNextCalls } from '@/api'
import { STORAGE_KEYS } from '@/store/persistence'
import { currentUrl, renderApp } from '../utils/renderWithProviders'

describe('Home page', () => {
  it('shows the temples and the latest notices', async () => {
    renderApp()
    const temples = await screen.findByRole('region', { name: 'Our temples' })
    expect(
      await within(temples).findByRole('link', { name: 'Sree Krishna Temple' }),
    ).toHaveAttribute('href', '/temples/tm-krishna')
    expect(within(temples).getAllByRole('listitem')).toHaveLength(3)

    const notices = screen.getByRole('region', { name: 'Latest notices' })
    expect(await within(notices).findAllByRole('article')).toHaveLength(3)
  })

  it('lets the user retry when the temples fail to load', async () => {
    failNextCalls(2) // notices and temples load at the same time; make both fail
    const { user } = renderApp()
    const temples = await screen.findByRole('region', { name: 'Our temples' })
    await user.click(await within(temples).findByRole('button', { name: 'Try again' }))
    expect(
      await within(temples).findByRole('link', { name: 'Sree Mahadeva Temple' }),
    ).toBeInTheDocument()
  })
})

describe('Temple details', () => {
  it('shows the temple, its daily schedule, contact and its own notices', async () => {
    renderApp({ url: '/temples/tm-krishna' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sree Krishna Temple' }),
    ).toBeInTheDocument()

    const schedule = screen.getByRole('table')
    expect(within(schedule).getByRole('cell', { name: 'Usha Pooja' })).toBeInTheDocument()
    expect(within(schedule).getByRole('cell', { name: '4:30 am' })).toBeInTheDocument()

    expect(screen.getByRole('link', { name: '0487 200 0001' })).toHaveAttribute(
      'href',
      'tel:04872000001',
    )

    const notices = screen.getByRole('region', { name: 'Notices for this temple' })
    expect(
      await within(notices).findByRole('link', { name: /Ekadasi festival/ }),
    ).toBeInTheDocument()
    expect(within(notices).queryByRole('link', { name: /Shivaratri/ })).not.toBeInTheDocument()
  })

  it('says so when the temple does not exist', async () => {
    renderApp({ url: '/temples/tm-nowhere' })
    expect(await screen.findByRole('heading', { name: 'Temple not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All temples' })).toHaveAttribute('href', '/temples')
  })
})

describe('Notifications page', () => {
  it('lists every notice, newest first', async () => {
    renderApp({ url: '/notifications' })
    expect(await screen.findByText('11 notices')).toBeInTheDocument()
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings[0]).toHaveTextContent('Temple closed in the afternoon for kalasam')
  })

  it('filters by temple and type through the URL, and Back restores the previous filter', async () => {
    const { user, router } = renderApp({ url: '/notifications' })
    await screen.findByText('11 notices')

    await user.selectOptions(screen.getByLabelText('Temple'), 'tm-sastha')
    expect(currentUrl(router)).toBe('/notifications?temple=tm-sastha')
    // 3 Sastha notices + 2 for all temples
    expect(await screen.findByText('5 notices')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Type'), 'FESTIVAL')
    expect(currentUrl(router)).toBe('/notifications?temple=tm-sastha&category=FESTIVAL')
    expect(await screen.findByText('1 notice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mandala season/ })).toBeInTheDocument()

    await act(() => router.navigate(-1))
    expect(await screen.findByText('5 notices')).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toHaveValue('')
  })

  it('opens a shared link with its filter already applied', async () => {
    renderApp({ url: '/notifications?category=CLOSURE' })
    expect(await screen.findByText('1 notice')).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toHaveValue('CLOSURE')
  })

  it('resets a link with an unknown temple and explains why', async () => {
    const { router } = renderApp({ url: '/notifications?temple=tm-nowhere' })
    expect(await screen.findByText(/unknown temple or notice type/)).toBeInTheDocument()
    await waitFor(() => expect(currentUrl(router)).toBe('/notifications'))
    expect(await screen.findByText('11 notices')).toBeInTheDocument()
  })

  it('shows an empty state with a way to clear the filters', async () => {
    const { user } = renderApp({ url: '/notifications?temple=tm-mahadeva&category=TIMING' })
    expect(await screen.findByText('No notices match these filters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('11 notices')).toBeInTheDocument()
  })

  it('opens a notice on its own page', async () => {
    const { user } = renderApp({ url: '/notifications' })
    await user.click(await screen.findByRole('link', { name: /Shivaratri/ }))
    expect(await screen.findByRole('heading', { level: 1, name: /Shivaratri/ })).toBeInTheDocument()
    expect(screen.getByText(/stays open through the night/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All notifications' })).toHaveAttribute(
      'href',
      '/notifications',
    )
  })

  it('shows "not found" for a removed notice', async () => {
    renderApp({ url: '/notifications/nt-gone' })
    expect(await screen.findByRole('heading', { name: 'Notice not found' })).toBeInTheDocument()
  })
})

describe('Notification bell', () => {
  it('counts new notices and clears the count once the notifications page is opened', async () => {
    const { user } = renderApp()
    // First visit: notices from the last 7 days count as new.
    const bell = await screen.findByRole('link', { name: /^Notifications, \d+ new$/ })
    await user.click(bell)
    await screen.findByRole('heading', { level: 1, name: 'Notifications' })
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /new$/ })).not.toBeInTheDocument(),
    )
    expect(localStorage.getItem(STORAGE_KEYS.noticesSeen)).not.toBeNull()
  })
})

describe('Language', () => {
  it('switches the interface and temple data to Malayalam, and remembers the choice', async () => {
    const { user } = renderApp({ url: '/temples/tm-krishna' })
    await screen.findByRole('heading', { level: 1, name: 'Sree Krishna Temple' })

    await user.click(screen.getByRole('button', { name: 'Switch to Malayalam' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'ശ്രീ കൃഷ്ണ ക്ഷേത്രം' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ദിവസേനയുള്ള പൂജാക്രമം' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'ഉഷഃപൂജ' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ml')
    expect(localStorage.getItem(STORAGE_KEYS.language)).toBe('"ml"')

    await user.click(screen.getByRole('button', { name: 'Switch to English' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sree Krishna Temple' }),
    ).toBeInTheDocument()
  })
})
