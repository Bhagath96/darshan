import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { requireUser } from './session'
import type { StoredUser } from './seed'
import { MAX_DAYS_AHEAD, MAX_QUANTITY, MIN_QUANTITY, NAKSHATRA_IDS } from '@/lib/constants'
import { addDays, isValidIsoDate, todayIST } from '@/lib/date'
import { can } from '@/lib/permissions'
import { normalizePhone } from '@/lib/phone'
import type { CreateOrderRequest, Order, OrderLine, OrderQuery, Paged } from '@/types'

function validateOrder(request: CreateOrderRequest): OrderLine[] {
  const db = getDb()
  if (!db.temples.some((t) => t.id === request.templeId))
    throw new ApiError('NOT_FOUND', 'Temple not found.')
  if (request.items.length === 0) throw new ApiError('VALIDATION', 'Add at least one offering.')
  if (request.devoteeName.trim().length < 2)
    throw new ApiError('VALIDATION', 'Please enter the devotee name.')
  if (!normalizePhone(request.phone))
    throw new ApiError('VALIDATION', 'Please enter a valid 10-digit mobile number.')
  if (!(NAKSHATRA_IDS as readonly string[]).includes(request.star)) {
    throw new ApiError('VALIDATION', 'Please choose a birth star.')
  }
  const today = todayIST()
  if (
    !isValidIsoDate(request.offeringDate) ||
    request.offeringDate < today ||
    request.offeringDate > addDays(today, MAX_DAYS_AHEAD)
  ) {
    throw new ApiError('VALIDATION', 'Please choose an offering date from today onwards.')
  }

  // Prices come from the server catalogue, never from the client.
  return request.items.map(({ offeringId, quantity }) => {
    const offering = db.offerings.find(
      (o) => o.id === offeringId && o.templeId === request.templeId,
    )
    if (!offering?.isActive)
      throw new ApiError('CONFLICT', 'One of the offerings is no longer available.')
    if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
      throw new ApiError(
        'VALIDATION',
        `Quantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`,
      )
    }
    return { offeringId, offeringName: offering.name, quantity, unitPrice: offering.price }
  })
}

/** Places an order. A retry with the same `idempotencyKey` returns the original order. */
export function createOrder(request: CreateOrderRequest): Promise<Order> {
  return simulate(
    'vazhipadu',
    () => {
      const user = requireUser('order:create')
      const items = validateOrder(request)
      const db = getDb()
      db.counters.order += 1
      const order: Order = {
        id: `od-${db.counters.order}`,
        orderNumber: `VZ${db.counters.order}`,
        templeId: request.templeId,
        userId: user.id,
        devoteeName: request.devoteeName.trim(),
        phone: normalizePhone(request.phone) ?? request.phone,
        star: request.star,
        offeringDate: request.offeringDate,
        items,
        totalAmount: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      }
      db.orders.unshift(order)
      return order
    },
    { idempotencyKey: request.idempotencyKey },
  )
}

function visibleOrders(user: StoredUser): Order[] {
  const { orders } = getDb()
  if (!can(user.role, 'order:viewAny')) return orders.filter((o) => o.userId === user.id)
  return user.templeId ? orders.filter((o) => o.templeId === user.templeId) : orders
}

/** Lists orders, newest first, with filters and pages. Out-of-range pages snap to the last page. */
export function getOrders(query: OrderQuery): Promise<Paged<Order>> {
  return simulate('vazhipadu', () => {
    const user = requireUser()
    const phoneDigits = query.phone?.replace(/\D/g, '') ?? ''
    const matches = visibleOrders(user).filter(
      (o) =>
        (!query.mine || o.userId === user.id) &&
        (!query.status || o.status === query.status) &&
        (!query.date || o.offeringDate === query.date) &&
        (!query.templeId || o.templeId === query.templeId) &&
        (!phoneDigits || o.phone.includes(phoneDigits)),
    )
    const pageSize = Math.max(1, query.pageSize)
    const lastPage = Math.max(1, Math.ceil(matches.length / pageSize))
    const page = Math.min(Math.max(1, query.page), lastPage)
    return {
      items: matches.slice((page - 1) * pageSize, page * pageSize),
      total: matches.length,
      page,
      pageSize,
    }
  })
}

/** One order by its number (receipt page). Devotees only get their own orders. */
export function getOrder(orderNumber: string): Promise<Order> {
  return simulate('vazhipadu', () => {
    const user = requireUser()
    const order = visibleOrders(user).find((o) => o.orderNumber === orderNumber)
    if (!order) throw new ApiError('NOT_FOUND', 'We could not find this order.')
    return order
  })
}

/** Cancels a confirmed order. Cancelling twice is harmless. */
export function cancelOrder(orderId: string): Promise<Order> {
  return simulate('vazhipadu', () => {
    const user = requireUser()
    const order = visibleOrders(user).find((o) => o.id === orderId)
    if (!order) throw new ApiError('NOT_FOUND', 'Order not found.')
    if (order.status === 'CANCELLED') return order
    if (order.status !== 'CONFIRMED')
      throw new ApiError('CONFLICT', 'Only confirmed orders can be cancelled.')
    order.status = 'CANCELLED'
    return order
  })
}
