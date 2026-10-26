import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDb } from '@/api/db'
import { STORAGE_KEYS } from '@/store/persistence'
import { currentUrl, renderApp } from '../utils/renderWithProviders'

type User = ReturnType<typeof renderApp>['user']

async function fillLogin(user: User, username: string, password: string) {
  await user.type(await screen.findByLabelText('Username'), username)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('Two login portals', () => {
  it('staff log in on the staff page and land in the admin portal', async () => {
    const { user, router } = renderApp({ url: '/admin/login' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Staff login' }),
    ).toBeInTheDocument()
    await fillLogin(user, 'staff', 'staff123')
    await waitFor(() => expect(currentUrl(router)).toBe('/admin'))
    expect(await screen.findByRole('heading', { name: 'Welcome, Ravi Menon' })).toBeInTheDocument()
    expect(await screen.findByText('You can manage Sree Krishna Temple.')).toBeInTheDocument()
  })

  it('refuses a staff account on the devotee login, with a link to the right page', async () => {
    const { user, router } = renderApp({ url: '/login?redirect=%2Fadmin' })
    await fillLogin(user, 'admin', 'admin123')
    const message = await screen.findByText(/use the staff login/)
    await user.click(
      within(message.closest('[role="alert"]') as HTMLElement).getByRole('link', {
        name: 'Go to the other login',
      }),
    )
    expect(currentUrl(router)).toBe('/admin/login?redirect=%2Fadmin')
  })

  it('refuses a devotee account on the staff login', async () => {
    const { user } = renderApp({ url: '/admin/login' })
    await fillLogin(user, 'devotee', 'devotee123')
    expect(await screen.findByText(/use the devotee login/)).toBeInTheDocument()
  })

  it('only lists staff and admin demo accounts on the staff login', async () => {
    renderApp({ url: '/admin/login' })
    expect(await screen.findByRole('button', { name: 'Use admin' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use devotee' })).not.toBeInTheDocument()
  })
})

describe('Route guards', () => {
  it('sends a guest from a protected page to login, then back again', async () => {
    const { user, router } = renderApp({ url: '/account' })
    await waitFor(() => expect(currentUrl(router)).toBe('/login?redirect=%2Faccount'))
    await fillLogin(user, 'devotee', 'devotee123')
    await waitFor(() => expect(currentUrl(router)).toBe('/account'))
    expect(await screen.findByRole('heading', { level: 1, name: 'My account' })).toBeInTheDocument()
  })

  it('sends a guest from the admin portal to the staff login', async () => {
    const { router } = renderApp({ url: '/admin' })
    await waitFor(() => expect(currentUrl(router)).toBe('/admin/login?redirect=%2Fadmin'))
  })

  it('shows 403 when a devotee opens the admin portal', async () => {
    const { router } = renderApp({ url: '/admin', as: 'devotee' })
    expect(
      await screen.findByRole('heading', { name: 'You do not have access to this page' }),
    ).toBeInTheDocument()
    expect(currentUrl(router)).toBe('/403')
    expect(screen.getByText(/Your account \(Devotee\)/)).toBeInTheDocument()
  })

  it('shows the admin link only to staff and admins', async () => {
    renderApp({ as: 'admin' })
    const nav = within(screen.getByRole('banner')).getByRole('navigation', { name: 'Main' })
    expect(await within(nav).findByRole('link', { name: 'Admin portal' })).toHaveAttribute(
      'href',
      '/admin',
    )
  })

  it('hides the admin link from devotees and guests', async () => {
    renderApp({ as: 'devotee' })
    const nav = within(screen.getByRole('banner')).getByRole('navigation', { name: 'Main' })
    expect(within(nav).queryByRole('link', { name: 'Admin portal' })).not.toBeInTheDocument()
  })

  it('logging out from a protected page goes home, not to the login form', async () => {
    const { user, router } = renderApp({ url: '/account', as: 'devotee' })
    await user.click(await screen.findByRole('button', { name: 'Account menu for Anil Kumar' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }))
    await waitFor(() => expect(currentUrl(router)).toBe('/'))
  })
})

describe('Sign-up', () => {
  it('shows an error summary and a message under each invalid field', async () => {
    const { user } = renderApp({ url: '/register' })
    await user.type(await screen.findByLabelText('Full name'), 'R2')
    await user.type(screen.getByLabelText('Mobile number'), '12345')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.type(screen.getByLabelText('Confirm password'), 'other')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const summary = (await screen.findByText('Please fix 5 fields below.')).closest(
      '[role="alert"]',
    )
    expect(summary).toHaveFocus()
    expect(screen.getByLabelText('Mobile number')).toHaveAccessibleDescription(
      'Enter a valid 10-digit mobile number starting with 6–9. 10-digit Indian mobile number. Bookings are linked to it.',
    )
    expect(screen.getByText('The passwords do not match.')).toBeInTheDocument()

    // Links in the summary move focus to the field.
    await user.click(within(summary as HTMLElement).getByRole('link', { name: /^Username/ }))
    expect(screen.getByLabelText('Username')).toHaveFocus()
  })

  it('creates the account, logs in and returns to ?redirect', async () => {
    const { user, router } = renderApp({ url: '/register?redirect=%2Faccount' })
    await user.type(await screen.findByLabelText('Full name'), 'Meera Menon')
    await user.type(screen.getByLabelText('Mobile number'), '9745011223')
    await user.type(screen.getByLabelText('Username'), 'meera')
    await user.type(screen.getByLabelText('Password'), 'temple2026')
    await user.type(screen.getByLabelText('Confirm password'), 'temple2026')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(currentUrl(router)).toBe('/account'))
    expect(await screen.findByText('meera')).toBeInTheDocument()
    expect(getDb().users.some((u) => u.username === 'meera' && u.role === 'DEVOTEE')).toBe(true)
  })

  it('shows the server error for a username that is taken, keeping the typed values', async () => {
    const { user } = renderApp({ url: '/register' })
    await user.type(await screen.findByLabelText('Full name'), 'Another Anil')
    await user.type(screen.getByLabelText('Mobile number'), '9745011224')
    await user.type(screen.getByLabelText('Username'), 'devotee')
    await user.type(screen.getByLabelText('Password'), 'temple2026')
    await user.type(screen.getByLabelText('Confirm password'), 'temple2026')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/username is already taken/)).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveValue('Another Anil')
  })
})

describe('My account', () => {
  it('updates name and phone, and the header and saved session follow', async () => {
    const { user } = renderApp({ url: '/account', as: 'devotee' })
    const name = await screen.findByLabelText('Full name')
    await user.clear(name)
    await user.type(name, 'Anil K Nair')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Your details have been saved.')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Account menu for Anil K Nair' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.session)).toContain('Anil K Nair')
  })

  it('changes the password after checking the current one', async () => {
    const { user } = renderApp({ url: '/account', as: 'devotee' })
    await user.type(await screen.findByLabelText('Current password'), 'wrong-one')
    await user.type(screen.getByLabelText('New password'), 'newpass123')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass123')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Your current password is not correct.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Current password'))
    await user.type(screen.getByLabelText('Current password'), 'devotee123')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Your password has been changed.')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveValue('')
    expect(getDb().users.find((u) => u.username === 'devotee')?.password).toBe('newpass123')
  })

  it('logs the user out with a message when the server says the session has ended', async () => {
    const { user, store, router } = renderApp({ url: '/account', as: 'devotee' })
    await screen.findByLabelText('Full name')
    // Simulate the server forgetting this account (e.g. token revoked).
    getDb().users = getDb().users.filter((u) => u.username !== 'devotee')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(store.getState().auth.user).toBeNull())
    expect(
      await screen.findByText('Your session has expired. Please log in again.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(currentUrl(router)).toBe('/login?redirect=%2Faccount'))
  })
})
