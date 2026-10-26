import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureMock, failNextCalls } from '@/api'
import { getDb } from '@/api/db'
import { formatINR } from '@/lib/currency'
import { freezeTime, TOMORROW } from '../utils/api'
import { currentUrl, renderApp } from '../utils/renderWithProviders'

beforeEach(() => freezeTime())
afterEach(() => vi.useRealTimers())

const adminMenu = () => screen.getByRole('navigation', { name: 'Admin' })

describe('Admin portal access', () => {
  it('shows staff only bookings, orders and notices', async () => {
    renderApp({ url: '/admin', as: 'staff' })
    await screen.findByRole('heading', { name: 'Welcome, Ravi Menon' })
    const links = within(adminMenu())
      .getAllByRole('link')
      .map((l) => l.textContent)
    expect(links).toEqual(['Overview', 'Darshan bookings', 'Vazhipadu orders', 'Notices'])
  })

  it('gives admins every section', async () => {
    renderApp({ url: '/admin', as: 'admin' })
    await screen.findByRole('heading', { name: 'Welcome, Devaswom Admin' })
    expect(within(adminMenu()).getAllByRole('link')).toHaveLength(7)
  })

  it('sends staff to 403 for admin-only pages', async () => {
    const { router } = renderApp({ url: '/admin/slots', as: 'staff' })
    expect(
      await screen.findByRole('heading', { name: 'You do not have access to this page' }),
    ).toBeInTheDocument()
    expect(currentUrl(router)).toBe('/403')
  })
})

describe('Dashboard', () => {
  it('leads with revenue and offers a table view of revenue by temple', async () => {
    const { user } = renderApp({ url: '/admin/dashboard', as: 'admin' })
    const revenue = getDb()
      .orders.filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0)
    const hero = await screen.findByRole('region', { name: 'Vazhipadu revenue' })
    expect(within(hero).getByText(formatINR(revenue))).toBeInTheDocument()
    expect(
      screen.getByRole('meter', { name: 'Darshan tickets booked, next 7 days' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show as table' }))
    const table = screen.getByRole('table', { name: /revenue, orders and active darshan bookings/ })
    expect(within(table).getAllByRole('row')).toHaveLength(4) // header + 3 temples
  })

  it('narrows to one temple through the URL', async () => {
    const { user, router } = renderApp({ url: '/admin/dashboard', as: 'admin' })
    await screen.findByRole('region', { name: 'Vazhipadu revenue' })
    await user.selectOptions(screen.getByLabelText('Temple'), 'tm-sastha')
    expect(currentUrl(router)).toBe('/admin/dashboard?temple=tm-sastha')
    await waitFor(() =>
      expect(screen.getAllByRole('listitem', { name: /from \d+ orders/ })).toHaveLength(1),
    )
  })
})

describe('Vazhipadu orders', () => {
  it('filters by status through the URL and goes back to page 1', async () => {
    const { user, router } = renderApp({ url: '/admin/orders?page=2', as: 'admin' })
    expect(await screen.findByText('50 orders')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Status'), 'CANCELLED')
    expect(currentUrl(router)).toBe('/admin/orders?status=CANCELLED')
    const cancelled = getDb().orders.filter((o) => o.status === 'CANCELLED').length
    expect(await screen.findByText(`${cancelled} orders`)).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.every((r) => within(r).queryByText('Cancelled'))).toBe(true)
  })

  it('restores filters and page from a link, and pages with Next', async () => {
    const { user, router } = renderApp({
      url: '/admin/orders?status=CONFIRMED&page=1',
      as: 'admin',
    })
    await screen.findByText(/^\d+ orders$/)
    expect(screen.getByLabelText('Status')).toHaveValue('CONFIRMED')
    await user.click(screen.getByRole('button', { name: /Next/ }))
    expect(currentUrl(router)).toBe('/admin/orders?status=CONFIRMED&page=2')
    expect(await screen.findByText('Page 2 of', { exact: false })).toBeInTheDocument()
  })

  it('snaps a page number past the end back to the last page', async () => {
    const { router } = renderApp({ url: '/admin/orders?page=99', as: 'admin' })
    await waitFor(() => expect(currentUrl(router)).toBe('/admin/orders?page=5'))
  })

  it('cancel shows CANCELLED at once, before the server answers', async () => {
    const order = getDb().orders.find((o) => o.status === 'CONFIRMED')!
    const { user } = renderApp({ url: `/admin/orders?phone=${order.phone}`, as: 'admin' })
    const row = (await screen.findByText(order.orderNumber)).closest('tr')!
    configureMock({ minDelay: 300, maxDelay: 300 })

    await user.click(within(row).getByRole('button', { name: `Cancel order ${order.orderNumber}` }))
    await user.click(await screen.findByRole('button', { name: 'Yes, cancel order' }))
    expect(within(row).getByText('Cancelled')).toBeInTheDocument()
    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe('CONFIRMED') // server not done yet

    await waitFor(() =>
      expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe('CANCELLED'),
    )
    expect(await screen.findByText(`Order ${order.orderNumber} cancelled.`)).toBeInTheDocument()
  })

  it('a failed cancel puts the old status back and says why', async () => {
    const order = getDb().orders.find((o) => o.status === 'CONFIRMED')!
    const { user } = renderApp({ url: `/admin/orders?phone=${order.phone}`, as: 'admin' })
    const row = (await screen.findByText(order.orderNumber)).closest('tr')!

    failNextCalls(1)
    await user.click(within(row).getByRole('button', { name: `Cancel order ${order.orderNumber}` }))
    await user.click(await screen.findByRole('button', { name: 'Yes, cancel order' }))
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument()
    expect(within(row).getByText('Confirmed')).toBeInTheDocument()
    expect(getDb().orders.find((o) => o.id === order.id)?.status).toBe('CONFIRMED')
  })

  it('staff only see their own temple', async () => {
    renderApp({ url: '/admin/orders', as: 'staff' })
    const own = getDb().orders.filter((o) => o.templeId === 'tm-krishna').length
    expect(await screen.findByText(`${own} orders`)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Temple' })).not.toBeInTheDocument()
  })

  it('exports every matching order as CSV', async () => {
    const createObjectURL = vi.fn(() => 'blob:orders')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const { user } = renderApp({ url: '/admin/orders?status=COMPLETED', as: 'admin' })
    await screen.findByText(/^\d+ orders$/)
    await user.click(screen.getByRole('button', { name: 'Export CSV' }))

    const completed = getDb().orders.filter((o) => o.status === 'COMPLETED').length
    expect(await screen.findByText(`Exported ${completed} orders.`)).toBeInTheDocument()
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    click.mockRestore()
  })
})

describe('Darshan bookings', () => {
  it('finds bookings by part of a phone number (debounced into the URL)', async () => {
    const { user, router } = renderApp({ url: '/admin/bookings', as: 'admin' })
    await screen.findByText(/^\d+ bookings$/)
    await user.type(screen.getByLabelText('Mobile number'), '98470')
    await waitFor(() => expect(currentUrl(router)).toBe('/admin/bookings?phone=98470'))
    const expected = getDb().bookings.filter((b) => b.phone.includes('98470')).length
    expect(await screen.findByText(`${expected} bookings`)).toBeInTheDocument()
  })

  it('cancels an upcoming booking and releases its tickets', async () => {
    const booking = getDb().bookings.find(
      (b) => b.phone === '9847012345' && b.date > '2026-10-26' && b.status === 'BOOKED',
    )!
    const slot = getDb().slots.find((s) => s.id === booking.slotId)!
    const before = slot.remainingTickets
    const { user } = renderApp({ url: '/admin/bookings?phone=9847012345', as: 'admin' })

    await user.click(
      await screen.findByRole('button', { name: `Cancel booking ${booking.bookingRef}` }),
    )
    await user.click(await screen.findByRole('button', { name: 'Yes, cancel booking' }))
    expect(await screen.findByText(`Booking ${booking.bookingRef} cancelled.`)).toBeInTheDocument()
    expect(slot.remainingTickets).toBe(before + booking.ticketCount)
  })

  it('explains why a started darshan cannot be cancelled', async () => {
    renderApp({ url: '/admin/bookings?phone=9847012345&date=2026-10-26', as: 'admin' })
    expect(
      await screen.findByText('Darshan has started, so it can no longer be cancelled.'),
    ).toBeInTheDocument()
  })
})

describe('Darshan slots', () => {
  const url = `/admin/slots?temple=tm-krishna&date=${TOMORROW}`

  it('raises a slot capacity', async () => {
    const { user } = renderApp({ url, as: 'admin' })
    const input = await screen.findByLabelText('Capacity of the 8:00 am slot')
    await user.clear(input)
    await user.type(input, '120')
    await user.click(screen.getByRole('button', { name: 'Save capacity of the 8:00 am slot' }))
    expect(await screen.findByText('Slot updated.')).toBeInTheDocument()
    expect(getDb().slots.find((s) => s.id === `sl-tm-krishna-${TOMORROW}-0800`)).toMatchObject({
      totalCapacity: 120,
      remainingTickets: 30,
    })
  })

  it('refuses a capacity below the tickets already booked', async () => {
    const { user } = renderApp({ url, as: 'admin' })
    const input = await screen.findByLabelText('Capacity of the 8:00 am slot')
    await user.clear(input)
    await user.type(input, '5')
    await user.click(screen.getByRole('button', { name: 'Save capacity of the 8:00 am slot' }))
    expect(input).toHaveAccessibleDescription('Enter a whole number from 90 to 500.')
  })

  it('closes a slot for booking', async () => {
    const { user } = renderApp({ url, as: 'admin' })
    await user.click(
      await screen.findByRole('button', { name: 'Close the 8:00 am slot for booking' }),
    )
    expect(
      await screen.findByRole('button', { name: 'Open the 8:00 am slot for booking' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(getDb().slots.find((s) => s.id === `sl-tm-krishna-${TOMORROW}-0800`)?.isBlocked).toBe(
        true,
      ),
    )
  })
})

describe('Offering rates', () => {
  it('changes a price and hides an offering', async () => {
    const { user } = renderApp({ url: '/admin/rates?temple=tm-krishna', as: 'admin' })
    const price = await screen.findByLabelText('Price of Pushpanjali in rupees')
    await user.clear(price)
    await user.type(price, '35')
    await user.click(screen.getByRole('button', { name: 'Save price of Pushpanjali' }))
    expect(await screen.findByText('Offering updated.')).toBeInTheDocument()
    expect(getDb().offerings.find((o) => o.id === 'tm-krishna--pushpanjali')?.price).toBe(35)

    const available = screen.getByRole('switch', { name: 'Archana can be booked by devotees' })
    expect(available).toBeChecked()
    await user.click(available)
    await waitFor(() =>
      expect(getDb().offerings.find((o) => o.id === 'tm-krishna--archana')?.isActive).toBe(false),
    )
  })
})

describe('Notices', () => {
  it('publishes a bilingual notice that then shows on the website', async () => {
    const { user, router } = renderApp({ url: '/admin/notices', as: 'staff' })
    await screen.findByRole('heading', { name: 'New notice' })
    await user.selectOptions(screen.getByLabelText('Type'), 'CLOSURE')
    await user.type(screen.getByLabelText('Title (English)'), 'Nada closed for eclipse')
    await user.type(screen.getByLabelText('Title (Malayalam)'), 'ഗ്രഹണം: നട അടച്ചിടും')
    await user.type(screen.getByLabelText('Notice text (English)'), 'Closed from 2 pm to 6 pm.')
    await user.type(screen.getByLabelText('Notice text (Malayalam)'), 'ഉച്ചയ്ക്ക് 2 മുതൽ 6 വരെ.')
    await user.click(screen.getByRole('button', { name: 'Publish notice' }))

    expect(await screen.findByText('Notice published.')).toBeInTheDocument()
    expect(screen.getByLabelText('Title (English)')).toHaveValue('')
    await router.navigate('/notifications')
    // A text query: role queries over this long page are slow.
    expect(
      await screen.findByText('Nada closed for eclipse', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it('shows a message for each missing field', async () => {
    const { user } = renderApp({ url: '/admin/notices', as: 'admin' })
    await user.click(await screen.findByRole('button', { name: 'Publish notice' }))
    expect(await screen.findAllByText('Enter a title.')).toHaveLength(2)
    expect(screen.getAllByText('Enter the notice text.')).toHaveLength(2)
  })

  it('deletes a notice after confirming', async () => {
    const { user } = renderApp({ url: '/admin/notices', as: 'staff' })
    await user.click(await screen.findByRole('button', { name: /Delete notice: Ekadasi festival/ }))
    await user.click(await screen.findByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByText('Notice deleted.')).toBeInTheDocument()
    expect(screen.queryByText(/Ekadasi festival/)).not.toBeInTheDocument()
    expect(getDb().notices.some((n) => n.id === 'nt-ekadasi')).toBe(false)
  })
})
