import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingApi, configureMock, failNextCalls } from '@/api'
import { getDb } from '@/api/db'
import type { DarshanSlot } from '@/types'
import { deferred, freezeTime, TODAY, TOMORROW } from '../utils/api'
import { currentUrl, renderApp } from '../utils/renderWithProviders'

const TEN_LEFT = `sl-tm-krishna-${TOMORROW}-0800`
const url = `/darshan?temple=tm-krishna&date=${TOMORROW}`
const slotCard = (time: string) =>
  screen.getByRole('button', { name: `Book the ${time} slot` }).closest('article')!

beforeEach(() => freezeTime())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function openForm(user: ReturnType<typeof renderApp>['user'], time = '8:00 am') {
  await user.click(await screen.findByRole('button', { name: `Book the ${time} slot` }))
  return screen.findByRole('dialog', { name: `Book darshan at ${time}` })
}

describe('P1 · slot list and booking', () => {
  it('shows each slot with its IST time and tickets left', async () => {
    renderApp({ url })
    expect(
      await screen.findByRole('heading', { name: 'Slots on Tue, 27 Oct, 2026' }),
    ).toBeInTheDocument()
    expect(within(slotCard('8:00 am')).getByText('10 of 100 tickets left')).toBeInTheDocument()
  })

  it('booking 3 of 10 shows 7 left and the booking reference', async () => {
    const { user } = renderApp({ url, as: 'devotee' })
    const dialog = await openForm(user)
    expect(within(dialog).getByLabelText('Devotee name')).toHaveValue('Anil Kumar')
    expect(within(dialog).getByLabelText('Mobile number')).toHaveValue('9847012345')

    const tickets = within(dialog).getByLabelText('Number of tickets')
    await user.clear(tickets)
    await user.type(tickets, '3')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm booking' }))

    const heading = await screen.findByRole('heading', { name: 'Darshan booked' })
    expect(heading).toHaveFocus()
    const booking = getDb().bookings.at(-1)!
    expect(screen.getByText(booking.bookingRef)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(within(slotCard('8:00 am')).getByText('7 of 100 tickets left')).toBeInTheDocument()
  })

  it('rejects more tickets than remain', async () => {
    const { user } = renderApp({ url, as: 'devotee' })
    const dialog = await openForm(user)
    const tickets = within(dialog).getByLabelText('Number of tickets')
    expect(tickets).toHaveAccessibleDescription('From 1 to 10.')
    await user.clear(tickets)
    await user.type(tickets, '11')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm booking' }))
    expect(
      await within(dialog).findByText('Choose from 1 up to the number of tickets left.'),
    ).toBeInTheDocument()
    expect(getDb().bookings.filter((b) => b.slotId === TEN_LEFT)).toHaveLength(0)
  })

  it('full, started and closed slots cannot be booked, and say why', async () => {
    const slots = getDb().slots
    slots.find((s) => s.id === `sl-tm-krishna-${TODAY}-1700`)!.remainingTickets = 0
    slots.find((s) => s.id === `sl-tm-krishna-${TODAY}-1830`)!.isBlocked = true
    renderApp({ url: `/darshan?temple=tm-krishna&date=${TODAY}`, as: 'devotee' })

    const started = await screen.findByRole('button', { name: 'Book the 5:00 am slot' })
    expect(started).toBeDisabled()
    expect(started).toHaveAccessibleDescription('This slot has already started.')
    expect(
      screen.getByRole('button', { name: 'Book the 5:00 pm slot' }),
    ).toHaveAccessibleDescription('All tickets are booked.')
    expect(
      screen.getByRole('button', { name: 'Book the 6:30 pm slot' }),
    ).toHaveAccessibleDescription('The temple has closed this slot for booking.')
  })

  it('a load failure shows an error, and Try again loads the slots', async () => {
    renderApp({ url: '/temples' }) // let temples load first
    await screen.findByRole('heading', { name: 'Temples' })
    failNextCalls(1)
    const { user } = renderApp({ url })
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Book the 8:00 am slot' })).toBeInTheDocument()
  })

  it('shows an empty state for a day with no slots', async () => {
    getDb().slots = getDb().slots.filter(
      (s) => !(s.templeId === 'tm-krishna' && s.date === TOMORROW),
    )
    renderApp({ url })
    expect(await screen.findByText('No darshan slots on this day.')).toBeInTheDocument()
  })

  it('sends a guest to log in first, then back to the same slots', async () => {
    const { user, router } = renderApp({ url })
    await user.click(await screen.findByRole('button', { name: 'Book the 8:00 am slot' }))
    expect(currentUrl(router)).toBe(`/login?redirect=${encodeURIComponent(url)}`)
    await user.type(await screen.findByLabelText('Username'), 'devotee')
    await user.type(screen.getByLabelText('Password'), 'devotee123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(currentUrl(router)).toBe(url))
  })
})

describe('P2 · shareable filters', () => {
  it('opens a shared link with that temple and day selected', async () => {
    renderApp({ url: `/darshan?temple=tm-sastha&date=${TOMORROW}` })
    await waitFor(() => expect(screen.getByLabelText('Temple')).toHaveValue('tm-sastha'))
    expect(screen.getByRole('radio', { name: 'Tue, 27 Oct, 2026' })).toBeChecked()
  })

  it('fills in today and the first temple when the link has neither', async () => {
    const { router } = renderApp({ url: '/darshan' })
    await waitFor(() => expect(currentUrl(router)).toBe(`/darshan?temple=tm-krishna&date=${TODAY}`))
    expect(screen.queryByText(/so it was reset/)).not.toBeInTheDocument()
  })

  it('resets an unknown temple or a day outside the week, with a notice', async () => {
    const { router } = renderApp({ url: '/darshan?temple=tm-nowhere&date=2027-01-01' })
    expect(await screen.findByText(/so it was reset/)).toBeInTheDocument()
    expect(currentUrl(router)).toBe(`/darshan?temple=tm-krishna&date=${TODAY}`)
  })

  it('Back returns to the previous selection', async () => {
    const { user, router } = renderApp({ url })
    await screen.findByRole('button', { name: 'Book the 8:00 am slot' })
    await user.selectOptions(screen.getByLabelText('Temple'), 'tm-mahadeva')
    await user.click(screen.getByRole('radio', { name: 'Thu, 29 Oct, 2026' }))
    expect(currentUrl(router)).toBe('/darshan?temple=tm-mahadeva&date=2026-10-29')

    await act(() => router.navigate(-1))
    expect(currentUrl(router)).toBe(`/darshan?temple=tm-mahadeva&date=${TOMORROW}`)
    await act(() => router.navigate(-1))
    expect(screen.getByLabelText('Temple')).toHaveValue('tm-krishna')
  })

  it('a slow first answer that arrives after a fast second one does not replace the slots', async () => {
    const slow = deferred<DarshanSlot[]>()
    const fast = deferred<DarshanSlot[]>()
    const real = getDb().slots
    const spy = vi
      .spyOn(bookingApi, 'getSlots')
      .mockImplementationOnce(() => slow.promise)
      .mockImplementationOnce(() => fast.promise)
    const { user } = renderApp({ url })
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    await user.selectOptions(screen.getByLabelText('Temple'), 'tm-sastha')
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2))

    fast.resolve(real.filter((s) => s.templeId === 'tm-sastha' && s.date === TOMORROW))
    await screen.findByRole('button', { name: 'Book the 8:00 am slot' })
    slow.resolve(
      real
        .filter((s) => s.templeId === 'tm-krishna' && s.date === TOMORROW)
        .map((s) => ({ ...s, remainingTickets: 1 })),
    )
    await act(() => Promise.resolve())

    expect(within(slotCard('8:00 am')).queryByText(/^1 of/)).not.toBeInTheDocument()
    const shown = getDb().slots.find((s) => s.id === `sl-tm-sastha-${TOMORROW}-0800`)!
    expect(
      within(slotCard('8:00 am')).getByText(
        `${shown.remainingTickets} of ${shown.totalCapacity} tickets left`,
      ),
    ).toBeInTheDocument()
  })
})

describe('P3 · safe submit', () => {
  it('a double click makes exactly one booking', async () => {
    const { user } = renderApp({ url, as: 'devotee' })
    const dialog = await openForm(user)
    configureMock({ minDelay: 100, maxDelay: 100 })
    const button = within(dialog).getByRole('button', { name: 'Confirm booking' })
    await user.dblClick(button)
    expect(await within(dialog).findByRole('button', { name: 'Booking…' })).toBeDisabled()
    await screen.findByRole('heading', { name: 'Darshan booked' })
    expect(getDb().bookings.filter((b) => b.slotId === TEN_LEFT)).toHaveLength(1)
  })

  it('a failure keeps the typed values, and Try again succeeds', async () => {
    const { user } = renderApp({ url, as: 'devotee' })
    const dialog = await openForm(user)
    const name = within(dialog).getByLabelText('Devotee name')
    await user.clear(name)
    await user.type(name, 'Lakshmi Amma')
    failNextCalls(1)
    await user.click(within(dialog).getByRole('button', { name: 'Confirm booking' }))

    const alert = (await within(dialog).findByText('The booking did not go through')).closest(
      '[role="alert"]',
    )!
    expect(alert).toHaveFocus()
    expect(name).toHaveValue('Lakshmi Amma')
    await user.click(within(alert as HTMLElement).getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { name: 'Darshan booked' })
    expect(getDb().bookings.at(-1)?.devoteeName).toBe('Lakshmi Amma')
  })

  it('"saved but the response was lost": the retry returns the same booking, tickets taken once', async () => {
    const { user } = renderApp({ url, as: 'devotee' })
    const dialog = await openForm(user)
    const tickets = within(dialog).getByLabelText('Number of tickets')
    await user.clear(tickets)
    await user.type(tickets, '3')
    failNextCalls(1, 'after')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm booking' }))
    await within(dialog).findByText('The server did not respond in time. Please try again.')
    expect(getDb().bookings.filter((b) => b.slotId === TEN_LEFT)).toHaveLength(1) // it did reach the server

    await user.click(within(dialog).getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { name: 'Darshan booked' })
    expect(getDb().bookings.filter((b) => b.slotId === TEN_LEFT)).toHaveLength(1)
    expect(getDb().slots.find((s) => s.id === TEN_LEFT)?.remainingTickets).toBe(7)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(within(slotCard('8:00 am')).getByText('7 of 100 tickets left')).toBeInTheDocument()
  })
})

describe('P4 · my bookings', () => {
  it('lists the devotee’s bookings and cancels one at once (optimistic)', async () => {
    const { user } = renderApp({ url: '/darshan/my-bookings', as: 'devotee' })
    const upcoming = getDb().bookings.find((b) => b.phone === '9847012345' && b.date > TODAY)!
    configureMock({ minDelay: 300, maxDelay: 300 })
    await user.click(
      await screen.findByRole('button', { name: `Cancel booking ${upcoming.bookingRef}` }),
    )
    await user.click(await screen.findByRole('button', { name: 'Yes, cancel' }))

    const card = screen.getByText(`Booking ${upcoming.bookingRef}`).closest('article')!
    expect(within(card).getByText('Cancelled')).toBeInTheDocument()
    expect(getDb().bookings.find((b) => b.id === upcoming.id)?.status).toBe('BOOKED') // not yet on the server
    expect(await screen.findByText(`Booking ${upcoming.bookingRef} cancelled.`)).toBeInTheDocument()
  })

  it('a failed cancel goes back to Booked and shows the error', async () => {
    const { user } = renderApp({ url: '/darshan/my-bookings', as: 'devotee' })
    const upcoming = getDb().bookings.find((b) => b.phone === '9847012345' && b.date > TODAY)!
    const cancel = await screen.findByRole('button', {
      name: `Cancel booking ${upcoming.bookingRef}`,
    })
    failNextCalls(1)
    await user.click(cancel)
    await user.click(await screen.findByRole('button', { name: 'Yes, cancel' }))
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument()
    const card = screen.getByText(`Booking ${upcoming.bookingRef}`).closest('article')!
    expect(within(card).getByText('Booked')).toBeInTheDocument()
  })

  it('a started booking has no cancel button, only the reason', async () => {
    renderApp({ url: '/darshan/my-bookings', as: 'devotee' })
    const started = getDb().bookings.find((b) => b.phone === '9847012345' && b.date === TODAY)!
    const card = (await screen.findByText(`Booking ${started.bookingRef}`)).closest('article')!
    expect(
      within(card).getByText('Darshan has started — it can no longer be cancelled.'),
    ).toBeInTheDocument()
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows times in IST even when the device is in New York', async () => {
    const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
      .process.env
    const original = env.TZ
    env.TZ = 'America/New_York'
    try {
      expect(new Date('2026-10-27T02:30:00Z').getHours()).toBe(22) // the device really is in New York
      renderApp({ url })
      expect(
        await screen.findByRole('button', { name: 'Book the 8:00 am slot' }),
      ).toBeInTheDocument()
    } finally {
      env.TZ = original
    }
  })
})

describe('P5 · keyboard and Malayalam', () => {
  it('books a darshan with the keyboard only', async () => {
    const { user } = renderApp({ url: `/darshan?temple=tm-krishna&date=${TODAY}`, as: 'devotee' })
    await screen.findByRole('button', { name: 'Book the 5:00 pm slot' })

    // Day picker: one Tab stop; arrows move the selection.
    screen.getByRole('radio', { name: 'Mon, 26 Oct, 2026' }).focus()
    await user.keyboard('{ArrowRight}')
    const tomorrow = screen.getByRole('radio', { name: 'Tue, 27 Oct, 2026' })
    expect(tomorrow).toBeChecked()
    expect(tomorrow).toHaveFocus()

    const book = await screen.findByRole('button', { name: 'Book the 8:00 am slot' })
    book.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Book darshan at 8:00 am' })
    expect(within(dialog).getByLabelText('Devotee name')).toHaveFocus()

    await user.tab() // phone
    await user.tab() // tickets
    expect(within(dialog).getByLabelText('Number of tickets')).toHaveFocus()
    await user.keyboard('{Backspace}2{Enter}')
    expect(await screen.findByRole('heading', { name: 'Darshan booked' })).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(book).toHaveFocus() // focus returns to where the user was
  })

  it('switches labels, buttons and dates to Malayalam', async () => {
    const { user } = renderApp({ url, as: 'devotee' })
    await screen.findByRole('button', { name: 'Book the 8:00 am slot' })
    await user.click(screen.getByRole('button', { name: 'Switch to Malayalam' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'ദർശനം ബുക്ക് ചെയ്യുക' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('ക്ഷേത്രം')).toBeInTheDocument()
    const radio = screen.getByRole('radio', { checked: true })
    expect(radio.getAttribute('aria-label')).toMatch(/ഒക്ടോ/) // Malayalam month name
    await user.click(screen.getAllByRole('button', { name: /സമയം ബുക്ക് ചെയ്യുക$/ })[2]!)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('ഭക്തന്റെ പേര്')).toHaveValue('Anil Kumar')
    expect(within(dialog).getByLabelText('ടിക്കറ്റുകളുടെ എണ്ണം')).toBeInTheDocument()
  })
})
