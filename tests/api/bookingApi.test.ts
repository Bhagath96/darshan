import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingApi, failNextCalls } from '@/api'
import { getDb } from '@/api/db'
import { actAs, freezeTime, TODAY, TOMORROW } from '../utils/api'

const slotId = (temple: string, date: string, time: string) => `sl-${temple}-${date}-${time}`
const TEN_LEFT = slotId('tm-krishna', TOMORROW, '0800')

const request = (overrides: Partial<Parameters<typeof bookingApi.createBooking>[0]> = {}) => ({
  slotId: TEN_LEFT,
  devoteeName: 'Anil Kumar',
  phone: '9847012345',
  ticketCount: 3,
  idempotencyKey: crypto.randomUUID(),
  ...overrides,
})

describe('bookingApi', () => {
  beforeEach(() => freezeTime())
  afterEach(() => vi.useRealTimers())

  describe('getSlots', () => {
    it('returns six slots for a day, earliest first', async () => {
      const slots = await bookingApi.getSlots('tm-krishna', TOMORROW)
      expect(slots).toHaveLength(6)
      const starts = slots.map((s) => s.startsAt)
      expect([...starts].sort()).toEqual(starts)
    })

    it('rejects an unknown temple and a malformed date', async () => {
      await expect(bookingApi.getSlots('tm-nowhere', TODAY)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
      await expect(bookingApi.getSlots('tm-krishna', '2026-13-45')).rejects.toMatchObject({
        code: 'VALIDATION',
      })
    })

    it('is public: no login needed', async () => {
      await expect(bookingApi.getSlots('tm-sastha', TODAY)).resolves.toHaveLength(6)
    })
  })

  describe('createBooking', () => {
    it('needs a logged-in user', async () => {
      await expect(bookingApi.createBooking(request())).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('books 3 of 10 and leaves 7', async () => {
      actAs('devotee')
      const booking = await bookingApi.createBooking(request())
      expect(booking).toMatchObject({ status: 'BOOKED', ticketCount: 3, slotId: TEN_LEFT })
      const slot = (await bookingApi.getSlots('tm-krishna', TOMORROW)).find(
        (s) => s.id === TEN_LEFT,
      )
      expect(slot?.remainingTickets).toBe(7)
    })

    it('rejects more tickets than remain', async () => {
      actAs('devotee')
      getDb().slots.find((s) => s.id === TEN_LEFT)!.remainingTickets = 2
      await expect(bookingApi.createBooking(request({ ticketCount: 3 }))).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'Only 2 tickets are left in this slot.',
      })
    })

    it('rejects a slot that has started, and a blocked slot', async () => {
      actAs('devotee')
      await expect(
        bookingApi.createBooking(request({ slotId: slotId('tm-krishna', TODAY, '0500') })),
      ).rejects.toMatchObject({ code: 'CONFLICT', message: 'This slot has already started.' })

      getDb().slots.find((s) => s.id === TEN_LEFT)!.isBlocked = true
      await expect(bookingApi.createBooking(request())).rejects.toMatchObject({ code: 'CONFLICT' })
    })

    it('validates name, phone and ticket count', async () => {
      actAs('devotee')
      await expect(bookingApi.createBooking(request({ phone: '12345' }))).rejects.toMatchObject({
        code: 'VALIDATION',
      })
      await expect(bookingApi.createBooking(request({ devoteeName: ' ' }))).rejects.toMatchObject({
        code: 'VALIDATION',
      })
      await expect(bookingApi.createBooking(request({ ticketCount: 0 }))).rejects.toMatchObject({
        code: 'VALIDATION',
      })
      await expect(bookingApi.createBooking(request({ ticketCount: 11 }))).rejects.toMatchObject({
        code: 'VALIDATION',
      })
    })

    it('normalises +91 phone numbers', async () => {
      actAs('devotee')
      const booking = await bookingApi.createBooking(request({ phone: '+91 98470 12345' }))
      expect(booking.phone).toBe('9847012345')
    })

    it('a retry after a lost response returns the same booking and takes the tickets only once', async () => {
      actAs('devotee')
      const req = request()
      failNextCalls(1, 'after')
      await expect(bookingApi.createBooking(req)).rejects.toMatchObject({ code: 'TIMEOUT' })
      const retried = await bookingApi.createBooking(req)

      const db = getDb()
      expect(db.bookings.filter((b) => b.id === retried.id)).toHaveLength(1)
      expect(db.slots.find((s) => s.id === TEN_LEFT)?.remainingTickets).toBe(7)
    })
  })

  describe('getBookings', () => {
    it('devotee sees their own bookings, latest slot first', async () => {
      actAs('devotee')
      const bookings = await bookingApi.getBookings('9847012345')
      expect(bookings.length).toBeGreaterThanOrEqual(3)
      expect(bookings.every((b) => b.phone === '9847012345')).toBe(true)
      const starts = bookings.map((b) => b.startsAt)
      expect([...starts].sort().reverse()).toEqual(starts)
    })

    it("a devotee cannot read someone else's bookings", async () => {
      actAs('lakshmi')
      expect(await bookingApi.getBookings('9847012345')).toEqual([])
    })

    it('staff only see bookings for their own temple; admin sees all', async () => {
      actAs('staff')
      const staffView = await bookingApi.getBookings('9847012345')
      expect(staffView.every((b) => b.templeId === 'tm-krishna')).toBe(true)

      actAs('admin')
      const adminView = await bookingApi.getBookings('9847012345')
      expect(adminView.some((b) => b.templeId === 'tm-sastha')).toBe(true)
    })
  })

  describe('cancelBooking', () => {
    it('cancels an upcoming booking and gives the tickets back', async () => {
      actAs('devotee')
      const booking = await bookingApi.createBooking(request())
      const cancelled = await bookingApi.cancelBooking(booking.id)
      expect(cancelled.status).toBe('CANCELLED')
      expect(getDb().slots.find((s) => s.id === TEN_LEFT)?.remainingTickets).toBe(10)
    })

    it('cancelling twice does not give tickets back twice', async () => {
      actAs('devotee')
      const booking = await bookingApi.createBooking(request())
      await bookingApi.cancelBooking(booking.id)
      await bookingApi.cancelBooking(booking.id)
      expect(getDb().slots.find((s) => s.id === TEN_LEFT)?.remainingTickets).toBe(10)
    })

    it('refuses once the darshan has started', async () => {
      actAs('devotee')
      const started = getDb().bookings.find((b) => b.phone === '9847012345' && b.date === TODAY)!
      await expect(bookingApi.cancelBooking(started.id)).rejects.toMatchObject({ code: 'CONFLICT' })
    })

    it("hides other people's bookings (NOT_FOUND, not FORBIDDEN)", async () => {
      actAs('lakshmi')
      const others = getDb().bookings.find((b) => b.phone === '9847012345')!
      await expect(bookingApi.cancelBooking(others.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })
})
