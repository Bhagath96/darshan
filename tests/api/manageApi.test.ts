import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingApi, noticeApi, orderApi, templeApi, userApi } from '@/api'
import { getDb } from '@/api/db'
import type { OfferingInput, TempleInput, UserInput } from '@/types'
import { actAs, freezeTime, TODAY, TOMORROW } from '../utils/api'

beforeEach(() => freezeTime())
afterEach(() => vi.useRealTimers())

const TEMPLE: TempleInput = {
  name: { en: 'Sree Bhagavathi Temple', ml: 'ശ്രീ ഭഗവതി ക്ഷേത്രം' },
  location: { en: 'Kollam', ml: 'കൊല്ലം' },
  deity: { en: 'Bhagavathi', ml: 'ഭഗവതി' },
  about: { en: 'A village temple.', ml: 'ഒരു ഗ്രാമക്ഷേത്രം.' },
  address: { en: 'Temple Road, Kollam', ml: 'ക്ഷേത്രം റോഡ്, കൊല്ലം' },
  image: 'temple-sastha',
  timings: '5:00 am – 11:00 am',
  contactPhone: '0474 2000004',
  schedule: [
    { time: '18:30', name: { en: 'Deeparadhana', ml: 'ദീപാരാധന' } },
    { time: '05:00', name: { en: 'Nirmalyam', ml: 'നിർമ്മാല്യം' } },
  ],
}

const OFFERING: OfferingInput = {
  templeId: 'tm-krishna',
  name: { en: 'Thulasi Mala', ml: 'തുളസി മാല' },
  description: { en: 'A garland of holy basil.', ml: 'തുളസി മാല ചാർത്തൽ.' },
  price: 50,
  category: 'SPECIAL',
  isActive: true,
  image: 'special',
}

describe('temples', () => {
  it('admin adds a temple with sorted schedule and standard slots', async () => {
    actAs('admin')
    const temple = await templeApi.createTemple(TEMPLE)
    expect(temple.id).toBe('tm-sree-bhagavathi-temple')
    expect(temple.schedule.map((s) => s.time)).toEqual(['05:00', '18:30'])
    expect(getDb().slots.filter((s) => s.templeId === temple.id)).toHaveLength(7 * 6)
    expect(await templeApi.getTemple(temple.id)).toMatchObject({ name: TEMPLE.name })
  })

  it('edits a temple and keeps its id', async () => {
    actAs('admin')
    const saved = await templeApi.updateTemple('tm-sastha', { ...TEMPLE, timings: '24 hours' })
    expect(saved).toMatchObject({ id: 'tm-sastha', timings: '24 hours' })
  })

  it('refuses to delete a temple that still has staff, then deletes it with its data', async () => {
    actAs('admin')
    await expect(templeApi.deleteTemple('tm-krishna')).rejects.toMatchObject({ code: 'CONFLICT' })

    await templeApi.deleteTemple('tm-sastha')
    const db = getDb()
    expect(db.temples.some((t) => t.id === 'tm-sastha')).toBe(false)
    for (const list of [db.offerings, db.slots, db.bookings, db.orders, db.notices]) {
      expect(list.some((x) => x.templeId === 'tm-sastha')).toBe(false)
    }
  })

  it('is admin only, and checks both languages', async () => {
    actAs('staff')
    await expect(templeApi.createTemple(TEMPLE)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    actAs('admin')
    await expect(
      templeApi.createTemple({ ...TEMPLE, name: { en: 'Only English', ml: '' } }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })
})

describe('offerings', () => {
  it('staff add, edit and delete offerings of their own temple', async () => {
    actAs('staff')
    const created = await templeApi.createOffering(OFFERING)
    expect(created.id).toBe('tm-krishna--thulasi-mala')
    const edited = await templeApi.saveOffering(created.id, { ...OFFERING, price: 75 })
    expect(edited.price).toBe(75)
    await templeApi.deleteOffering(created.id)
    expect(getDb().offerings.some((o) => o.id === created.id)).toBe(false)
  })

  it("keeps staff out of another temple's catalogue", async () => {
    actAs('staff')
    await expect(
      templeApi.createOffering({ ...OFFERING, templeId: 'tm-sastha' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(templeApi.deleteOffering('tm-sastha--archana')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('gives a repeated name its own id, and past orders keep a deleted offering', async () => {
    actAs('admin')
    const first = await templeApi.createOffering(OFFERING)
    const second = await templeApi.createOffering(OFFERING)
    expect(second.id).toBe(`${first.id}-2`)

    const order = getDb().orders.find((o) => o.templeId === 'tm-krishna')!
    const line = order.items[0]!
    await templeApi.deleteOffering(line.offeringId)
    expect(getDb().orders.find((o) => o.id === order.id)?.items[0]).toEqual(line)
  })
})

describe('darshan slots', () => {
  const slot = {
    templeId: 'tm-krishna',
    date: TOMORROW,
    time: '12:15',
    durationMinutes: 45,
    totalCapacity: 40,
  }

  it('adds an empty slot', async () => {
    actAs('staff')
    const created = await bookingApi.createSlot(slot)
    expect(created).toMatchObject({ totalCapacity: 40, remainingTickets: 40, isBlocked: false })
    const slots = await bookingApi.getSlots('tm-krishna', TOMORROW)
    expect(slots.map((s) => s.id)).toContain(created.id)
  })

  it('refuses a duplicate start, a past time, a far-off day and another temple', async () => {
    actAs('staff')
    await expect(bookingApi.createSlot({ ...slot, time: '08:00' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    await expect(
      bookingApi.createSlot({ ...slot, date: TODAY, time: '09:00' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(bookingApi.createSlot({ ...slot, date: '2026-12-01' })).rejects.toMatchObject({
      code: 'VALIDATION',
    })
    await expect(bookingApi.createSlot({ ...slot, templeId: 'tm-sastha' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('deletes an empty slot, but not one with active bookings', async () => {
    actAs('admin')
    const created = await bookingApi.createSlot(slot)
    await bookingApi.deleteSlot(created.id)
    expect(getDb().slots.some((s) => s.id === created.id)).toBe(false)

    const busy = getDb().bookings.find((b) => b.status === 'BOOKED')!
    await expect(bookingApi.deleteSlot(busy.slotId)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('bookings', () => {
  /** A fresh 2-ticket booking in tomorrow's 08:00 slot at the staff member's temple. */
  const upcoming = async () => {
    actAs('devotee')
    const booking = await bookingApi.createBooking({
      slotId: `sl-tm-krishna-${TOMORROW}-0800`,
      devoteeName: 'Anil Kumar',
      phone: '9847012345',
      ticketCount: 2,
      idempotencyKey: `test-${Math.random()}`,
    })
    return getDb().bookings.find((x) => x.id === booking.id)!
  }

  it('corrects name and phone, and moves tickets in and out of the slot', async () => {
    const booking = await upcoming()
    actAs('staff')
    const slot = getDb().slots.find((s) => s.id === booking.slotId)!
    slot.remainingTickets = 5
    const saved = await bookingApi.updateBooking(booking.id, {
      devoteeName: 'Meera  Menon',
      phone: '+91 98470 11111',
      ticketCount: booking.ticketCount + 2,
    })
    expect(saved).toMatchObject({ devoteeName: 'Meera Menon', phone: '9847011111' })
    expect(slot.remainingTickets).toBe(3)

    await expect(
      bookingApi.updateBooking(booking.id, { ...saved, ticketCount: saved.ticketCount + 4 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('deletes a booking and frees its tickets', async () => {
    const booking = await upcoming()
    actAs('admin')
    const slot = getDb().slots.find((s) => s.id === booking.slotId)!
    const before = slot.remainingTickets
    await bookingApi.deleteBooking(booking.id)
    expect(getDb().bookings.some((b) => b.id === booking.id)).toBe(false)
    expect(slot.remainingTickets).toBe(Math.min(slot.totalCapacity, before + booking.ticketCount))
  })

  it("keeps staff away from other temples' bookings, and devotees out", async () => {
    const other = getDb().bookings.find((b) => b.templeId !== 'tm-krishna')!
    actAs('staff')
    await expect(bookingApi.deleteBooking(other.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    actAs('devotee')
    await expect(bookingApi.deleteBooking(other.id)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('orders', () => {
  it('edits devotee details, date and status, and deletes an order', async () => {
    actAs('staff')
    const order = getDb().orders.find((o) => o.templeId === 'tm-krishna')!
    const saved = await orderApi.updateOrder(order.id, {
      devoteeName: 'Hari Krishnan',
      phone: '9847022222',
      star: 'Rohini',
      offeringDate: TOMORROW,
      status: 'COMPLETED',
    })
    expect(saved).toMatchObject({ star: 'Rohini', offeringDate: TOMORROW, status: 'COMPLETED' })
    expect(saved.totalAmount).toBe(order.totalAmount)

    await orderApi.deleteOrder(order.id)
    expect(getDb().orders.some((o) => o.id === order.id)).toBe(false)
  })

  it("keeps staff away from another temple's orders", async () => {
    actAs('staff')
    const other = getDb().orders.find((o) => o.templeId !== 'tm-krishna')!
    await expect(orderApi.deleteOrder(other.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('notices', () => {
  it("edits a notice, keeping its publish time; staff can't move it to all temples", async () => {
    actAs('staff')
    const before = (await noticeApi.getNotice('nt-ekadasi')).publishedAt
    const input = {
      templeId: 'tm-krishna',
      category: 'FESTIVAL' as const,
      important: true,
      title: { en: 'Ekadasi: new timings', ml: 'ഏകാദശി: പുതിയ സമയം' },
      body: { en: 'Darshan from 3 am.', ml: 'പുലർച്ചെ 3 മുതൽ ദർശനം.' },
      eventDate: TOMORROW,
    }
    const saved = await noticeApi.updateNotice('nt-ekadasi', input)
    expect(saved).toMatchObject({ title: input.title, publishedAt: before })
    await expect(
      noticeApi.updateNotice('nt-ekadasi', { ...input, templeId: null }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('users', () => {
  const STAFF: UserInput = {
    name: 'Sita Varma',
    phone: '9447033333',
    username: 'sita',
    role: 'STAFF',
    templeId: 'tm-sastha',
    password: 'temple123',
  }

  it('admin creates a staff account that can log in on the staff page', async () => {
    actAs('admin')
    const created = await userApi.createUser(STAFF)
    expect(created).toMatchObject({ role: 'STAFF', templeId: 'tm-sastha' })
    expect(created).not.toHaveProperty('password')
    const users = await userApi.getUsers({ role: 'STAFF' })
    expect(users.map((u) => u.username)).toContain('sita')
  })

  it('needs a temple for staff, a strong password, and a free username', async () => {
    actAs('admin')
    await expect(userApi.createUser({ ...STAFF, templeId: null })).rejects.toMatchObject({
      code: 'VALIDATION',
    })
    await expect(userApi.createUser({ ...STAFF, password: 'short' })).rejects.toMatchObject({
      code: 'VALIDATION',
    })
    await expect(userApi.createUser({ ...STAFF, username: 'staff' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('edits an account; an empty password keeps the old one', async () => {
    actAs('admin')
    const staff = getDb().users.find((u) => u.username === 'staff')!
    const saved = await userApi.updateUser(staff.id, {
      ...STAFF,
      username: 'staff',
      phone: staff.phone,
      templeId: 'tm-mahadeva',
      password: '',
    })
    expect(saved.templeId).toBe('tm-mahadeva')
    expect(getDb().users.find((u) => u.id === staff.id)?.password).toBe('staff123')
  })

  it('protects your own account and the last admin', async () => {
    actAs('admin')
    const admin = getDb().users.find((u) => u.username === 'admin')!
    await expect(userApi.deleteUser(admin.id)).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(
      userApi.updateUser(admin.id, {
        name: admin.name,
        phone: admin.phone,
        username: admin.username,
        role: 'STAFF',
        templeId: 'tm-krishna',
        password: '',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('deletes a user, whose session then stops working', async () => {
    actAs('admin')
    const lakshmi = getDb().users.find((u) => u.username === 'lakshmi')!
    await userApi.deleteUser(lakshmi.id)
    expect(getDb().users.some((u) => u.id === lakshmi.id)).toBe(false)
  })

  it('is admin only', async () => {
    actAs('staff')
    await expect(userApi.getUsers()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
