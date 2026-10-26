import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { failNextCalls, orderApi } from '@/api'
import { getDb } from '@/api/db'
import type { CreateOrderRequest } from '@/types'
import { actAs, freezeTime, TODAY } from '../utils/api'

const order = (overrides: Partial<CreateOrderRequest> = {}): CreateOrderRequest => ({
  templeId: 'tm-krishna',
  items: [
    { offeringId: 'tm-krishna--pushpanjali', quantity: 2 },
    { offeringId: 'tm-krishna--archana', quantity: 1 },
  ],
  devoteeName: 'Anil Kumar',
  phone: '9847012345',
  star: 'Rohini',
  offeringDate: TODAY,
  idempotencyKey: crypto.randomUUID(),
  ...overrides,
})

describe('orderApi', () => {
  beforeEach(() => freezeTime())
  afterEach(() => vi.useRealTimers())

  describe('createOrder', () => {
    it('totals 2 × ₹30 + 1 × ₹50 = ₹110 using server prices', async () => {
      actAs('devotee')
      const created = await orderApi.createOrder(order())
      expect(created).toMatchObject({
        totalAmount: 110,
        status: 'CONFIRMED',
        templeId: 'tm-krishna',
      })
      expect(created.orderNumber).toMatch(/^VZ\d+$/)
    })

    it('rejects an inactive offering, an offering from another temple, and a bad quantity', async () => {
      actAs('devotee')
      const inactive = getDb().offerings.find((o) => o.templeId === 'tm-krishna' && !o.isActive)!
      await expect(
        orderApi.createOrder(order({ items: [{ offeringId: inactive.id, quantity: 1 }] })),
      ).rejects.toMatchObject({ code: 'CONFLICT' })
      await expect(
        orderApi.createOrder(
          order({ items: [{ offeringId: 'tm-sastha--pushpanjali', quantity: 1 }] }),
        ),
      ).rejects.toMatchObject({ code: 'CONFLICT' })
      await expect(
        orderApi.createOrder(
          order({ items: [{ offeringId: 'tm-krishna--pushpanjali', quantity: 11 }] }),
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION' })
    })

    it('rejects a past offering date, an empty cart and an unknown star', async () => {
      actAs('devotee')
      await expect(
        orderApi.createOrder(order({ offeringDate: '2026-10-25' })),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
      })
      await expect(orderApi.createOrder(order({ items: [] }))).rejects.toMatchObject({
        code: 'VALIDATION',
      })
      await expect(
        orderApi.createOrder(order({ star: 'Pluto' as CreateOrderRequest['star'] })),
      ).rejects.toMatchObject({ code: 'VALIDATION' })
    })

    it('a retry with the same key after a lost response creates no duplicate', async () => {
      actAs('devotee')
      const before = getDb().orders.length
      const req = order()
      failNextCalls(1, 'after')
      await expect(orderApi.createOrder(req)).rejects.toMatchObject({ code: 'TIMEOUT' })
      const retried = await orderApi.createOrder(req)
      expect(getDb().orders).toHaveLength(before + 1)
      expect(getDb().orders[0]?.id).toBe(retried.id)
    })
  })

  describe('getOrders', () => {
    it('pages 10 at a time, newest first, and snaps an out-of-range page to the last one', async () => {
      actAs('admin')
      const first = await orderApi.getOrders({ page: 1, pageSize: 10 })
      expect(first.items).toHaveLength(10)
      expect(first.total).toBe(50)

      const beyond = await orderApi.getOrders({ page: 99, pageSize: 10 })
      expect(beyond.page).toBe(5)
      expect(beyond.items).toHaveLength(10)
    })

    it('filters by status, offering date and partial phone', async () => {
      actAs('admin')
      const cancelled = await orderApi.getOrders({ status: 'CANCELLED', page: 1, pageSize: 50 })
      expect(cancelled.items.every((o) => o.status === 'CANCELLED')).toBe(true)

      const sample = getDb().orders[0]!
      const byDate = await orderApi.getOrders({ date: sample.offeringDate, page: 1, pageSize: 50 })
      expect(byDate.items.every((o) => o.offeringDate === sample.offeringDate)).toBe(true)

      const byPhone = await orderApi.getOrders({
        phone: sample.phone.slice(2, 7),
        page: 1,
        pageSize: 50,
      })
      expect(byPhone.items.map((o) => o.id)).toContain(sample.id)
    })

    it('staff only see their temple; devotees only see their own orders', async () => {
      actAs('staff')
      const staffView = await orderApi.getOrders({ page: 1, pageSize: 50 })
      expect(staffView.items.length).toBeGreaterThan(0)
      expect(staffView.items.every((o) => o.templeId === 'tm-krishna')).toBe(true)

      actAs('devotee')
      expect((await orderApi.getOrders({ page: 1, pageSize: 50 })).total).toBe(0)
    })

    it('needs a login', async () => {
      await expect(orderApi.getOrders({ page: 1, pageSize: 10 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })
  })

  describe('cancelOrder', () => {
    it('cancels a confirmed order; a second cancel is harmless', async () => {
      actAs('admin')
      const confirmed = getDb().orders.find((o) => o.status === 'CONFIRMED')!
      await expect(orderApi.cancelOrder(confirmed.id)).resolves.toMatchObject({
        status: 'CANCELLED',
      })
      await expect(orderApi.cancelOrder(confirmed.id)).resolves.toMatchObject({
        status: 'CANCELLED',
      })
    })

    it('refuses to cancel a completed order', async () => {
      actAs('admin')
      const completed = getDb().orders.find((o) => o.status === 'COMPLETED')!
      await expect(orderApi.cancelOrder(completed.id)).rejects.toMatchObject({ code: 'CONFLICT' })
    })

    it("staff cannot cancel another temple's order", async () => {
      actAs('staff')
      const other = getDb().orders.find(
        (o) => o.templeId !== 'tm-krishna' && o.status === 'CONFIRMED',
      )!
      await expect(orderApi.cancelOrder(other.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })
})

describe('orderApi.getOrder', () => {
  beforeEach(() => freezeTime())
  afterEach(() => vi.useRealTimers())

  it('returns your own order by number, and hides other people’s', async () => {
    actAs('devotee')
    const created = await orderApi.createOrder(order())
    await expect(orderApi.getOrder(created.orderNumber)).resolves.toMatchObject({ id: created.id })

    actAs('lakshmi')
    await expect(orderApi.getOrder(created.orderNumber)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })

    actAs('staff') // the order is for Sree Krishna Temple, staff's temple
    await expect(orderApi.getOrder(created.orderNumber)).resolves.toMatchObject({ id: created.id })
  })
})

describe('orderApi.getOrders mine', () => {
  beforeEach(() => freezeTime())
  afterEach(() => vi.useRealTimers())

  it('returns only the orders the user placed, even for staff', async () => {
    actAs('staff')
    const own = await orderApi.createOrder(order())
    const mine = await orderApi.getOrders({ mine: true, page: 1, pageSize: 50 })
    expect(mine.items.map((o) => o.id)).toEqual([own.id])
  })
})
