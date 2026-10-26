import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { failNextCalls } from '@/api'
import { issueToken } from '@/api/session'
import { makeStore } from '@/store'
import { loadAuthState } from '@/store/auth/authSlice'
import { STORAGE_KEYS } from '@/store/persistence'
import { currentUrl, renderApp } from '../utils/renderWithProviders'

async function logIn(
  user: ReturnType<typeof renderApp>['user'],
  username: string,
  password: string,
) {
  await user.type(await screen.findByLabelText('Username'), username)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('Login page', () => {
  it('shows a message under each empty field', async () => {
    const { user } = renderApp({ url: '/login' })
    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Enter your username.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('Enter your username.')
  })

  it('shows an error for a wrong password and keeps the user on the page', async () => {
    const { user, router } = renderApp({ url: '/login' })
    await logIn(user, 'devotee', 'wrong')
    const alert = (await screen.findByText('Incorrect username or password.')).closest(
      '[role="alert"]',
    )
    expect(alert).toHaveFocus()
    expect(currentUrl(router)).toBe('/login')
  })

  it('shows and hides the password', async () => {
    const { user } = renderApp({ url: '/login' })
    const password = await screen.findByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('logs in and goes back to the page in ?redirect=, saving the session', async () => {
    const { user, router } = renderApp({ url: '/login?redirect=%2Ftemples%2Ftm-sastha' })
    await logIn(user, 'devotee', 'devotee123')
    await waitFor(() => expect(currentUrl(router)).toBe('/temples/tm-sastha'))
    expect(
      await screen.findByRole('button', { name: 'Account menu for Anil Kumar' }),
    ).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.session) ?? '{}')).toMatchObject({
      user: { username: 'devotee' },
    })
  })

  it('ignores a redirect to another site', async () => {
    const { user, router } = renderApp({ url: '/login?redirect=%2F%2Fevil.example.com' })
    await logIn(user, 'lakshmi', 'lakshmi123')
    await waitFor(() => expect(currentUrl(router)).toBe('/'))
  })

  it('fills the form from the demo accounts box', async () => {
    const { user } = renderApp({ url: '/login' })
    await user.click(await screen.findByRole('button', { name: 'Use lakshmi' }))
    expect(screen.getByLabelText('Username')).toHaveValue('lakshmi')
    expect(screen.getByLabelText('Password')).toHaveValue('lakshmi123')
    // Staff accounts are listed on the staff login, not here.
    expect(screen.queryByRole('button', { name: 'Use staff' })).not.toBeInTheDocument()
  })

  it('a double click sends one login request', async () => {
    const { user, store } = renderApp({ url: '/login' })
    await user.type(await screen.findByLabelText('Username'), 'devotee')
    await user.type(screen.getByLabelText('Password'), 'devotee123')
    const states: string[] = []
    const unsubscribe = store.subscribe(() => states.push(store.getState().auth.status))
    await user.dblClick(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(store.getState().auth.user).not.toBeNull())
    unsubscribe()
    expect(states.filter((s, i) => s === 'loading' && states[i - 1] !== 'loading')).toHaveLength(1)
  })
})

describe('Session', () => {
  it('logging out clears the user and the saved session', async () => {
    const { user } = renderApp({ url: '/', as: 'devotee' })
    await user.click(await screen.findByRole('button', { name: 'Account menu for Anil Kumar' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }))
    const header = screen.getByRole('banner')
    expect(await within(header).findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull()
  })

  it('a page reload keeps the user logged in (session restored from storage)', async () => {
    const token = issueToken('u-staff-1')
    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({
        token,
        user: {
          id: 'u-staff-1',
          username: 'staff',
          name: 'Ravi Menon',
          phone: '9447011111',
          role: 'STAFF',
          templeId: 'tm-krishna',
        },
      }),
    )
    renderApp({ preloadedState: { auth: loadAuthState() } })
    expect(
      await screen.findByRole('button', { name: 'Account menu for Ravi Menon' }),
    ).toBeInTheDocument()
  })

  it('an expired saved session logs the user out', async () => {
    const expired = issueToken('u-devotee-1', Date.now() - 30 * 24 * 60 * 60 * 1000)
    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({
        token: expired,
        user: {
          id: 'u-devotee-1',
          username: 'devotee',
          name: 'Anil Kumar',
          phone: '9847012345',
          role: 'DEVOTEE',
          templeId: null,
        },
      }),
    )
    const store = makeStore({ auth: loadAuthState() })
    await waitFor(() => expect(store.getState().auth.user).toBeNull())
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull()
  })

  it('a network error while checking the session keeps the user logged in', async () => {
    const token = issueToken('u-devotee-1')
    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({
        token,
        user: {
          id: 'u-devotee-1',
          username: 'devotee',
          name: 'Anil Kumar',
          phone: '9847012345',
          role: 'DEVOTEE',
          templeId: null,
        },
      }),
    )
    failNextCalls(1)
    const store = makeStore({ auth: loadAuthState() })
    // First check fails; the saga waits and retries, and the user stays logged in throughout.
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(store.getState().auth.user?.username).toBe('devotee')
    expect(store.getState().auth.restoring).toBe(true)
  })

  it('ignores a hand-edited or broken saved session', () => {
    localStorage.setItem(STORAGE_KEYS.session, '{"token":1}')
    expect(loadAuthState().user).toBeNull()
    localStorage.setItem(STORAGE_KEYS.session, 'not json')
    expect(loadAuthState().user).toBeNull()
  })
})
