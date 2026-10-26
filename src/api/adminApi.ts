import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { requireUser } from './session'
import { ORDER_STATUSES } from '@/lib/constants'
import { addDays, todayIST } from '@/lib/date'
import type { DashboardStats, OrderStatus } from '@/types'

/** Admin: headline numbers for one temple, or for all temples when templeId is omitted. */
export function getDashboard(templeId?: string): Promise<DashboardStats> {
  return simulate('vazhipadu', () => {
    requireUser('dashboard:view')
    const db = getDb()
    if (templeId && !db.temples.some((t) => t.id === templeId))
      throw new ApiError('NOT_FOUND', 'Temple not found.')

    const today = todayIST()
    const weekEnd = addDays(today, 6)
    const inScope = <T extends { templeId: string }>(x: T) => !templeId || x.templeId === templeId
    const orders = db.orders.filter(inScope)
    const bookings = db.bookings.filter(inScope)
    const weekSlots = db.slots.filter((s) => inScope(s) && s.date >= today && s.date <= weekEnd)

    const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
      OrderStatus,
      number
    >
    for (const o of orders) byStatus[o.status] += 1
    const earns = (status: OrderStatus) => status === 'CONFIRMED' || status === 'COMPLETED'

    const active = bookings.filter((b) => b.status === 'BOOKED')
    const todays = active.filter((b) => b.date === today)
    const capacity = weekSlots.reduce((sum, s) => sum + s.totalCapacity, 0)
    const taken = weekSlots.reduce((sum, s) => sum + s.totalCapacity - s.remainingTickets, 0)

    const temples = templeId ? db.temples.filter((t) => t.id === templeId) : db.temples
    return {
      templeId: templeId ?? null,
      today,
      orders: {
        byStatus,
        today: orders.filter((o) => o.offeringDate === today && o.status !== 'CANCELLED').length,
        revenue: orders.filter((o) => earns(o.status)).reduce((sum, o) => sum + o.totalAmount, 0),
      },
      bookings: {
        today: todays.length,
        ticketsToday: todays.reduce((sum, b) => sum + b.ticketCount, 0),
        upcoming: active.filter((b) => b.date > today).length,
        cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
      },
      slots: {
        utilisation: capacity === 0 ? 0 : taken / capacity,
        full: weekSlots.filter((s) => s.remainingTickets === 0).length,
        blocked: weekSlots.filter((s) => s.isBlocked).length,
      },
      byTemple: temples.map((t) => {
        const own = db.orders.filter((o) => o.templeId === t.id && earns(o.status))
        return {
          templeId: t.id,
          revenue: own.reduce((sum, o) => sum + o.totalAmount, 0),
          orders: own.length,
          bookings: db.bookings.filter((b) => b.templeId === t.id && b.status === 'BOOKED').length,
        }
      }),
    }
  })
}
