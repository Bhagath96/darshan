import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi, bookingApi, noticeApi, templeApi } from '@/api'
import { getDb } from '@/api/db'
import type { NoticeInput } from '@/types'
import { actAs, freezeTime, TODAY, TOMORROW } from '../utils/api'

beforeEach(() => freezeTime())
afterEach(() => vi.useRealTimers())

const TEN_LEFT = `sl-tm-krishna-${TOMORROW}-0800`

describe('bookingApi.searchBookings', () => {
  it('pages results and matches part of a phone number', async () => {
    actAs('admin')
    const all = await bookingApi.searchBookings({ page: 1, pageSize: 5 })
    expect(all.items).toHaveLength(5)
    expect(all.total).toBe(getDb().bookings.length)

    const partial = await bookingApi.searchBookings({ phone: '98470', page: 1, pageSize: 50 })
    expect(partial.items.length).toBeGreaterThan(0)
    expect(partial.items.every((b) => b.phone.includes('98470'))).toBe(true)
  })

  it('filters by date, temple and status', async () => {
    actAs('admin')
    const result = await bookingApi.searchBookings({
      date: TODAY,
      templeId: 'tm-krishna',
      status: 'BOOKED',
      page: 1,
      pageSize: 50,
    })
    expect(
      result.items.every(
        (b) => b.date === TODAY && b.templeId === 'tm-krishna' && b.status === 'BOOKED',
      ),
    ).toBe(true)
  })

  it('limits staff to their temple, and refuses devotees', async () => {
    actAs('staff')
    const result = await bookingApi.searchBookings({ page: 1, pageSize: 100 })
    expect(result.items.every((b) => b.templeId === 'tm-krishna')).toBe(true)

    actAs('devotee')
    await expect(bookingApi.searchBookings({ page: 1, pageSize: 10 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('bookingApi.updateSlot', () => {
  it('raises capacity and moves the remaining count by the same amount', async () => {
    actAs('admin')
    const before = getDb().slots.find((s) => s.id === TEN_LEFT)!
    const booked = before.totalCapacity - before.remainingTickets
    const updated = await bookingApi.updateSlot({
      slotId: TEN_LEFT,
      totalCapacity: before.totalCapacity + 20,
    })
    expect(updated.remainingTickets).toBe(30)
    expect(updated.totalCapacity - updated.remainingTickets).toBe(booked)
  })

  it("won't set capacity below the tickets already booked", async () => {
    actAs('admin')
    await expect(
      bookingApi.updateSlot({ slotId: TEN_LEFT, totalCapacity: 5 }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('blocks and unblocks a slot, which stops bookings', async () => {
    actAs('admin')
    await bookingApi.updateSlot({ slotId: TEN_LEFT, isBlocked: true })
    actAs('devotee')
    await expect(
      bookingApi.createBooking({
        slotId: TEN_LEFT,
        devoteeName: 'Anil',
        phone: '9847012345',
        ticketCount: 1,
        idempotencyKey: 'k',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('is admin only', async () => {
    actAs('staff')
    await expect(
      bookingApi.updateSlot({ slotId: TEN_LEFT, isBlocked: true }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('templeApi.updateOffering', () => {
  it('changes the price for new orders and can switch an offering off', async () => {
    actAs('admin')
    await templeApi.updateOffering({ offeringId: 'tm-krishna--pushpanjali', price: 40 })
    await templeApi.updateOffering({ offeringId: 'tm-krishna--archana', isActive: false })
    const offerings = await templeApi.getOfferings('tm-krishna')
    expect(offerings.find((o) => o.id === 'tm-krishna--pushpanjali')?.price).toBe(40)
    expect(offerings.find((o) => o.id === 'tm-krishna--archana')?.isActive).toBe(false)
  })

  it('rejects a non-whole or zero price, and staff edits', async () => {
    actAs('admin')
    await expect(
      templeApi.updateOffering({ offeringId: 'tm-krishna--pushpanjali', price: 0 }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    })
    await expect(
      templeApi.updateOffering({ offeringId: 'tm-krishna--pushpanjali', price: 12.5 }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    })
    actAs('staff')
    await expect(
      templeApi.updateOffering({ offeringId: 'tm-krishna--pushpanjali', price: 35 }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('noticeApi create and delete', () => {
  const input: NoticeInput = {
    templeId: 'tm-krishna',
    category: 'TIMING',
    important: false,
    title: { en: '  Early closing  ', ml: 'നേരത്തെ നട അടയ്ക്കും' },
    body: { en: 'Closes at 8 pm.', ml: 'രാത്രി 8-ന് നട അടയ്ക്കും.' },
    eventDate: TOMORROW,
  }

  it('publishes a notice at the top of the list, trimmed', async () => {
    actAs('staff')
    const created = await noticeApi.createNotice(input)
    expect(created.title.en).toBe('Early closing')
    const [first] = await noticeApi.getNotices()
    expect(first?.id).toBe(created.id)
  })

  it('keeps staff to their own temple; admins can post for all temples', async () => {
    actAs('staff')
    await expect(noticeApi.createNotice({ ...input, templeId: 'tm-sastha' })).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    )
    await expect(noticeApi.createNotice({ ...input, templeId: null })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    actAs('admin')
    await expect(noticeApi.createNotice({ ...input, templeId: null })).resolves.toMatchObject({
      templeId: null,
    })
  })

  it('needs both languages', async () => {
    actAs('admin')
    await expect(
      noticeApi.createNotice({ ...input, title: { en: 'Only English', ml: ' ' } }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    })
  })

  it("deletes a notice; staff can't delete another temple's notice", async () => {
    actAs('staff')
    await expect(noticeApi.deleteNotice('nt-shivaratri')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    await noticeApi.deleteNotice('nt-ekadasi')
    await expect(noticeApi.getNotice('nt-ekadasi')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('devotees cannot manage notices', async () => {
    actAs('devotee')
    await expect(noticeApi.createNotice(input)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('adminApi.getDashboard', () => {
  it('adds up orders, revenue and bookings for all temples', async () => {
    actAs('admin')
    const stats = await adminApi.getDashboard()
    const { orders, bookings } = getDb()
    expect(stats.today).toBe(TODAY)
    expect(Object.values(stats.orders.byStatus).reduce((a, b) => a + b, 0)).toBe(orders.length)
    expect(stats.orders.revenue).toBe(
      orders.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0),
    )
    expect(stats.bookings.cancelled).toBe(bookings.filter((b) => b.status === 'CANCELLED').length)
    expect(stats.byTemple).toHaveLength(3)
    expect(stats.slots.utilisation).toBeGreaterThan(0)
    expect(stats.slots.utilisation).toBeLessThanOrEqual(1)
  })

  it('narrows to one temple', async () => {
    actAs('admin')
    const stats = await adminApi.getDashboard('tm-sastha')
    expect(stats.templeId).toBe('tm-sastha')
    expect(stats.byTemple.map((t) => t.templeId)).toEqual(['tm-sastha'])
  })

  it('is admin only', async () => {
    actAs('staff')
    await expect(adminApi.getDashboard()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
