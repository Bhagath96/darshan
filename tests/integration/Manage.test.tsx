import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { failNextCalls } from '@/api'
import { getDb } from '@/api/db'
import { freezeTime, TOMORROW } from '../utils/api'
import { renderApp } from '../utils/renderWithProviders'

beforeEach(() => freezeTime())
afterEach(() => vi.useRealTimers())

const dialog = (name: string | RegExp) => screen.findByRole('dialog', { name })

describe('Temples (admin)', () => {
  it('adds a temple, which then shows on the website', async () => {
    const { user, router } = renderApp({ url: '/admin/temples', as: 'admin' })
    await user.click(await screen.findByRole('button', { name: 'Add temple' }))
    const form = within(await dialog('Add temple'))

    // Paste rather than type: twelve fields typed key by key are slow on a busy machine.
    const fill = async (label: string, value: string) => {
      await user.click(form.getByLabelText(label))
      await user.paste(value)
    }
    await fill('Temple name (English)', 'Sree Bhagavathi Temple')
    await fill('Temple name (Malayalam)', 'ശ്രീ ഭഗവതി ക്ഷേത്രം')
    await fill('Place (English)', 'Kollam')
    await fill('Place (Malayalam)', 'കൊല്ലം')
    await fill('Deity (English)', 'Bhagavathi')
    await fill('Deity (Malayalam)', 'ഭഗവതി')
    await fill('About the temple (English)', 'A village temple.')
    await fill('About the temple (Malayalam)', 'ഗ്രാമക്ഷേത്രം.')
    await fill('Address (English)', 'Temple Road')
    await fill('Address (Malayalam)', 'ക്ഷേത്രം റോഡ്')
    await fill('Opening hours', '5:00 am – 11:00 am')
    await fill('Temple phone number', '0474 2000004')
    await user.click(form.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Temple added.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(getDb().slots.filter((s) => s.templeId === 'tm-sree-bhagavathi-temple')).toHaveLength(42)

    await router.navigate('/temples')
    expect(await screen.findByText('Sree Bhagavathi Temple')).toBeInTheDocument()
  }, 15_000)

  it('shows a message for each missing field and sends nothing', async () => {
    const { user } = renderApp({ url: '/admin/temples', as: 'admin' })
    await user.click(await screen.findByRole('button', { name: 'Add temple' }))
    const form = within(await dialog('Add temple'))
    await user.click(form.getByRole('button', { name: 'Create' }))
    expect(await form.findAllByText('This field is required.')).toHaveLength(11)
    expect(getDb().temples).toHaveLength(3)
  })

  it('explains why a temple with staff cannot be deleted', async () => {
    const { user } = renderApp({ url: '/admin/temples', as: 'admin' })
    await user.click(await screen.findByRole('button', { name: 'Delete Sree Krishna Temple' }))
    await user.click(await screen.findByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByText(/1 staff account belongs to this temple/)).toBeInTheDocument()
    expect(getDb().temples).toHaveLength(3)
  })
})

describe('Offerings (staff)', () => {
  it('staff add an offering to their own temple', async () => {
    const { user } = renderApp({ url: '/admin/rates?temple=tm-sastha', as: 'staff' })
    // Staff always work on their own temple, whatever the link says.
    expect(await screen.findByLabelText('Price of Pushpanjali in rupees')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Temple' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add offering' }))
    const form = within(await dialog('Add offering'))
    await user.type(form.getByLabelText('Offering name (English)'), 'Thulasi Mala')
    await user.type(form.getByLabelText('Offering name (Malayalam)'), 'തുളസി മാല')
    await user.type(form.getByLabelText('Description (English)'), 'A basil garland.')
    await user.type(form.getByLabelText('Description (Malayalam)'), 'തുളസി മാല.')
    await user.type(form.getByLabelText('Price (₹)'), '50')
    await user.click(form.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Offering added.')).toBeInTheDocument()
    expect(await screen.findByLabelText('Price of Thulasi Mala in rupees')).toHaveValue(50)
    expect(getDb().offerings.find((o) => o.id === 'tm-krishna--thulasi-mala')).toMatchObject({
      templeId: 'tm-krishna',
      price: 50,
    })
  })

  it('deletes an offering after confirming', async () => {
    const { user } = renderApp({ url: '/admin/rates', as: 'staff' })
    await user.click(await screen.findByRole('button', { name: 'Delete Archana' }))
    await user.click(await screen.findByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByText('Offering deleted.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Price of Archana in rupees')).not.toBeInTheDocument()
    expect(getDb().offerings.some((o) => o.id === 'tm-krishna--archana')).toBe(false)
  })
})

describe('Darshan slots (staff)', () => {
  it('adds a slot to the day on screen, then deletes it', async () => {
    const { user } = renderApp({ url: `/admin/slots?date=${TOMORROW}`, as: 'staff' })
    await screen.findByLabelText('Capacity of the 8:00 am slot')
    await user.click(screen.getByRole('button', { name: 'Add slot' }))
    const form = within(await dialog('Add slot'))
    fireEvent.change(form.getByLabelText('Start time'), { target: { value: '12:15' } })
    await user.clear(form.getByLabelText('Capacity'))
    await user.type(form.getByLabelText('Capacity'), '40')
    await user.click(form.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Slot added.')).toBeInTheDocument()
    expect(await screen.findByLabelText('Capacity of the 12:15 pm slot')).toHaveValue(40)

    await user.click(screen.getByRole('button', { name: 'Delete the 12:15 pm slot' }))
    await user.click(await screen.findByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByText('Slot deleted.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Capacity of the 12:15 pm slot')).not.toBeInTheDocument()
  })

  it('a failed save keeps the dialog open with the reason', async () => {
    const { user } = renderApp({ url: `/admin/slots?date=${TOMORROW}`, as: 'staff' })
    await screen.findByLabelText('Capacity of the 8:00 am slot')
    await user.click(screen.getByRole('button', { name: 'Add slot' }))
    const form = within(await dialog('Add slot'))
    fireEvent.change(form.getByLabelText('Start time'), { target: { value: '08:00' } })
    await user.click(form.getByRole('button', { name: 'Create' }))
    expect(
      await form.findByText('A slot already starts at this time on this day.'),
    ).toBeInTheDocument()

    failNextCalls(1)
    fireEvent.change(form.getByLabelText('Start time'), { target: { value: '13:00' } })
    await user.click(form.getByRole('button', { name: 'Create' }))
    expect(await form.findByText(/Could not reach the server/)).toBeInTheDocument()
    expect(form.getByLabelText('Start time')).toHaveValue('13:00')
  })
})

describe('Bookings and orders', () => {
  it('edits the devotee name on a booking', async () => {
    const booking = getDb().bookings.find((b) => b.phone === '9847012345')!
    const { user } = renderApp({ url: '/admin/bookings?phone=9847012345', as: 'admin' })
    await user.click(
      await screen.findByRole('button', { name: `Edit booking ${booking.bookingRef}` }),
    )
    const form = within(await dialog(`Edit booking ${booking.bookingRef}`))
    const name = form.getByLabelText('Devotee')
    await user.clear(name)
    await user.type(name, 'Anil K Nair')
    await user.click(form.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Booking updated.')).toBeInTheDocument()
    expect(getDb().bookings.find((b) => b.id === booking.id)?.devoteeName).toBe('Anil K Nair')
    expect((await screen.findAllByText('Anil K Nair')).length).toBeGreaterThan(0)
  })

  it('deletes an order after confirming', async () => {
    const order = getDb().orders[0]!
    const { user } = renderApp({ url: `/admin/orders?phone=${order.phone}`, as: 'admin' })
    await user.click(
      await screen.findByRole('button', { name: `Delete order ${order.orderNumber}` }),
    )
    await user.click(await screen.findByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByText('Order deleted.')).toBeInTheDocument()
    expect(screen.queryByText(order.orderNumber)).not.toBeInTheDocument()
    expect(getDb().orders.some((o) => o.id === order.id)).toBe(false)
  })
})

describe('Users (admin)', () => {
  it('creates a staff account for a temple, which can then log in', async () => {
    const { user, router } = renderApp({ url: '/admin/users', as: 'admin' })
    expect(await screen.findByText('4 accounts')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add user' }))
    const form = within(await dialog('Add user'))
    await user.type(form.getByLabelText('Name'), 'Sita Varma')
    await user.type(form.getByLabelText('Mobile number'), '9447033333')
    await user.type(form.getByLabelText('Username'), 'sita')
    await user.click(form.getByRole('button', { name: 'Create' }))
    expect(
      await form.findByText('Choose the temple this staff member works at.'),
    ).toBeInTheDocument()

    await user.selectOptions(form.getByLabelText('Temple'), 'tm-sastha')
    await user.type(form.getByLabelText('Password'), 'temple123')
    await user.click(form.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('Account created.')).toBeInTheDocument()
    expect(await screen.findByText('5 accounts')).toBeInTheDocument()
    expect(getDb().users.find((u) => u.username === 'sita')).toMatchObject({
      role: 'STAFF',
      templeId: 'tm-sastha',
    })

    await router.navigate('/admin/users?role=STAFF')
    expect(await screen.findByText('2 accounts')).toBeInTheDocument()
  })

  it('deletes another user, but offers no delete for yourself', async () => {
    const { user } = renderApp({ url: '/admin/users', as: 'admin' })
    await screen.findByText('4 accounts')
    expect(screen.queryByRole('button', { name: 'Delete Devaswom Admin' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete Lakshmi Nair' }))
    await user.click(await screen.findByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByText('Account deleted.')).toBeInTheDocument()
    expect(await screen.findByText('3 accounts')).toBeInTheDocument()
    expect(getDb().users.some((u) => u.username === 'lakshmi')).toBe(false)
  })
})

describe('Notices', () => {
  it('staff edit a notice, and the change shows in the list', async () => {
    const { user } = renderApp({ url: '/admin/notices', as: 'staff' })
    await user.click(await screen.findByRole('button', { name: /Edit notice: Ekadasi festival/ }))
    const form = within(await dialog('Edit notice'))
    const title = form.getByLabelText('Title (English)')
    await user.clear(title)
    await user.type(title, 'Ekadasi: darshan from 3 am')
    await user.click(form.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Notice updated.')).toBeInTheDocument()
    expect(await screen.findByText('Ekadasi: darshan from 3 am')).toBeInTheDocument()
    expect(getDb().notices.find((n) => n.id === 'nt-ekadasi')?.title.en).toBe(
      'Ekadasi: darshan from 3 am',
    )
  })
})
