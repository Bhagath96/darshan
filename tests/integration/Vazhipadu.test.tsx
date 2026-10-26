import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureMock, failNextCalls } from '@/api'
import { getDb } from '@/api/db'
import { STORAGE_KEYS } from '@/store/persistence'
import { loadCartState } from '@/store/vazhipadu/cartSlice'
import { freezeTime } from '../utils/api'
import { currentUrl, renderApp } from '../utils/renderWithProviders'

beforeEach(() => freezeTime())
afterEach(() => vi.useRealTimers())

type User = ReturnType<typeof renderApp>['user']
const cart = () => screen.getByRole('complementary', { name: 'Your cart' })

async function addToCart(user: User, name: string, times = 1) {
  const button = await screen.findByRole('button', { name: `Add ${name} to cart` })
  for (let i = 0; i < times; i++) await user.click(button)
}

describe('V1 · offerings list', () => {
  it('shows active offerings only, with prices', async () => {
    renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    expect(await screen.findByText('8 offerings')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ganapathi Homam' })).not.toBeInTheDocument() // inactive
    const card = screen.getByRole('heading', { name: 'Pushpanjali' }).closest('article')!
    expect(within(card).getByText('₹30')).toBeInTheDocument()
  })

  it('"push" finds only Pushpanjali, and the search goes into the URL', async () => {
    const { user, router } = renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    await screen.findByText('8 offerings')
    await user.type(screen.getByLabelText('Search offerings'), 'push')
    expect(await screen.findByText('1 offering')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pushpanjali' })).toBeInTheDocument()
    await waitFor(() => expect(currentUrl(router)).toBe('/vazhipadu?temple=tm-krishna&q=push'))
  })

  it('searches the Malayalam name too, and offers to clear a search with no match', async () => {
    const { user } = renderApp({ url: '/vazhipadu?temple=tm-krishna&q=അർച്ചന' })
    expect(await screen.findByRole('heading', { name: 'Archana' })).toBeInTheDocument()

    const search = screen.getByLabelText('Search offerings')
    await user.clear(search)
    await user.type(search, 'xyz')
    expect(await screen.findByText('No offerings match “xyz”.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(await screen.findByText('8 offerings')).toBeInTheDocument()
  })

  it('filters by category tab', async () => {
    const { user, router } = renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    await screen.findByText('8 offerings')
    await user.click(screen.getByRole('tab', { name: 'Nivedyam' }))
    expect(currentUrl(router)).toBe('/vazhipadu?temple=tm-krishna&category=NIVEDYAM')
    expect(await screen.findByText('4 offerings')).toBeInTheDocument()
  })

  it('a load failure shows Try again, which loads the list', async () => {
    renderApp({ url: '/temples' })
    await screen.findByRole('heading', { name: 'Temples' })
    failNextCalls(1)
    const { user } = renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('8 offerings')).toBeInTheDocument()
  })
})

describe('V2 · cart and order form', () => {
  it('2 × ₹30 + 1 × ₹50 = ₹110', async () => {
    const { user } = renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    await addToCart(user, 'Pushpanjali', 2)
    await addToCart(user, 'Archana')
    expect(within(cart()).getByText('₹110')).toBeInTheDocument()
    expect(within(cart()).getByLabelText('Quantity of Pushpanjali')).toHaveValue(2)
  })

  it('changes quantity within 1–10 and removes lines', async () => {
    const { user } = renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    await addToCart(user, 'Pushpanjali')
    const less = within(cart()).getByRole('button', { name: 'One less Pushpanjali' })
    expect(less).toBeDisabled()
    await user.click(within(cart()).getByRole('button', { name: 'One more Pushpanjali' }))
    expect(within(cart()).getAllByText('₹60')).toHaveLength(2) // line total and cart total
    await user.click(within(cart()).getByRole('button', { name: 'Remove Pushpanjali' }))
    expect(within(cart()).getByText('Your cart is empty.')).toBeInTheDocument()
  })

  it('keeps the cart after a reload', async () => {
    const { user, unmount } = renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    await addToCart(user, 'Archana', 2)
    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEYS.cart)).toContain('tm-krishna--archana'),
    )
    unmount()

    renderApp({ url: '/vazhipadu', preloadedState: { cart: loadCartState() } })
    expect(await within(cart()).findByLabelText('Quantity of Archana')).toHaveValue(2)
  })

  it('asks before replacing a cart from another temple', async () => {
    const { user } = renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    await addToCart(user, 'Pushpanjali')
    await user.selectOptions(screen.getByLabelText('Temple'), 'tm-sastha')
    await addToCart(user, 'Neyyabhishekam')

    const dialog = await screen.findByRole('alertdialog', { name: 'Start a new cart?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep my cart' }))
    expect(within(cart()).getByText('Pushpanjali')).toBeInTheDocument()

    await addToCart(user, 'Neyyabhishekam')
    await user.click(await screen.findByRole('button', { name: 'Empty cart and add' }))
    expect(within(cart()).getByText('Neyyabhishekam')).toBeInTheDocument()
    expect(within(cart()).queryByText('Pushpanjali')).not.toBeInTheDocument()
  })

  it('shows a message for each invalid field, and rejects a past date', async () => {
    const { user } = renderApp({
      url: '/vazhipadu/checkout',
      as: 'devotee',
      preloadedState: {
        cart: {
          templeId: 'tm-krishna',
          items: [
            {
              offeringId: 'tm-krishna--pushpanjali',
              templeId: 'tm-krishna',
              name: { en: 'Pushpanjali', ml: 'പുഷ്പാഞ്ജലി' },
              unitPrice: 30,
              quantity: 1,
            },
          ],
        },
      },
    })
    await user.clear(await screen.findByLabelText('Devotee name'))
    await user.clear(screen.getByLabelText('Mobile number'))
    await user.type(screen.getByLabelText('Mobile number'), '123')
    const date = screen.getByLabelText('Offering date')
    await user.clear(date)
    await user.type(date, '2026-10-25')
    await user.click(screen.getByRole('button', { name: /Place order/ }))

    expect(await screen.findByText('Please fix 4 fields below.')).toBeInTheDocument()
    expect(screen.getByLabelText('Birth star (nakshatra)')).toHaveAccessibleDescription(
      'Choose the birth star.',
    )
    expect(date).toHaveAccessibleDescription(/Choose a date from today up to 90 days ahead./)
    expect(screen.getByLabelText('Mobile number')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('V3 · placing the order', () => {
  async function fillAndPlace(user: User) {
    await user.selectOptions(await screen.findByLabelText('Birth star (nakshatra)'), 'Rohini')
    await user.click(screen.getByRole('button', { name: /Place order/ }))
  }

  async function startCheckout() {
    const view = renderApp({ url: '/vazhipadu?temple=tm-krishna', as: 'devotee' })
    await addToCart(view.user, 'Pushpanjali', 2)
    await addToCart(view.user, 'Archana')
    await view.user.click(within(cart()).getByRole('link', { name: 'Continue' }))
    await screen.findByRole('heading', { level: 1, name: 'Offering details' })
    return view
  }

  it('places the order, shows the receipt with focus on it, and empties the cart', async () => {
    const { user, router } = await startCheckout()
    expect(screen.getByRole('button', { name: 'Place order · ₹110' })).toBeInTheDocument()
    await fillAndPlace(user)

    const heading = await screen.findByRole('heading', { level: 1, name: 'Order placed' })
    expect(heading).toHaveFocus()
    const order = getDb().orders[0]!
    expect(currentUrl(router)).toBe(`/vazhipadu/orders/${order.orderNumber}`)
    expect(order).toMatchObject({ totalAmount: 110, star: 'Rohini', devoteeName: 'Anil Kumar' })
    expect(screen.getByText(order.orderNumber)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) ?? '{}')).toEqual({
      templeId: null,
      items: [],
    })
  })

  it('a double click places exactly one order', async () => {
    const { user } = await startCheckout()
    const before = getDb().orders.length
    await user.selectOptions(screen.getByLabelText('Birth star (nakshatra)'), 'Rohini')
    configureMock({ minDelay: 100, maxDelay: 100 })
    await user.dblClick(screen.getByRole('button', { name: /Place order/ }))
    await screen.findByRole('heading', { level: 1, name: 'Order placed' })
    expect(getDb().orders).toHaveLength(before + 1)
  })

  it('a failure keeps the cart and the form, and Try again places the order once', async () => {
    const { user } = await startCheckout()
    const before = getDb().orders.length
    failNextCalls(1, 'after') // saved on the server, but the answer is lost
    await fillAndPlace(user)

    const alert = (await screen.findByText('The order did not go through')).closest(
      '[role="alert"]',
    ) as HTMLElement
    expect(alert).toHaveFocus()
    expect(screen.getByLabelText('Birth star (nakshatra)')).toHaveValue('Rohini')
    expect(screen.getByRole('button', { name: 'Place order · ₹110' })).toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { level: 1, name: 'Order placed' })
    expect(getDb().orders).toHaveLength(before + 1)
  })

  it('asks a guest to log in before checkout, keeping the cart', async () => {
    const { user, router } = renderApp({ url: '/vazhipadu?temple=tm-krishna' })
    await addToCart(user, 'Archana')
    await user.click(within(cart()).getByRole('link', { name: 'Continue' }))
    await waitFor(() => expect(currentUrl(router)).toBe('/login?redirect=%2Fvazhipadu%2Fcheckout'))
  })
})

describe('Receipt and my orders', () => {
  it('lists my orders and opens a receipt', async () => {
    const view = renderApp({ url: '/vazhipadu?temple=tm-krishna', as: 'devotee' })
    await addToCart(view.user, 'Archana')
    await view.user.click(within(cart()).getByRole('link', { name: 'Continue' }))
    await view.user.selectOptions(await screen.findByLabelText('Birth star (nakshatra)'), 'Bharani')
    await view.user.click(screen.getByRole('button', { name: /Place order/ }))
    await screen.findByRole('heading', { level: 1, name: 'Order placed' })
    const order = getDb().orders[0]!

    await view.user.click(screen.getByRole('link', { name: 'See my orders' }))
    await view.user.click(
      await screen.findByRole('link', { name: `View receipt for order ${order.orderNumber}` }),
    )
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: `Receipt for order ${order.orderNumber}`,
      }),
    ).toBeInTheDocument()
  })

  it('does not show another person’s receipt', async () => {
    const someone = getDb().orders[0]!
    renderApp({ url: `/vazhipadu/orders/${someone.orderNumber}`, as: 'lakshmi' })
    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument()
  })
})
