import { toCsv } from '@/lib/csv'
import { formatDateTimeIST } from '@/lib/date'
import type { Order, Temple } from '@/types'

/** One row per order; offerings joined as "Pushpanjali × 2; Archana × 1". English column names. */
export function ordersToCsv(orders: Order[], temples: Temple[]): string {
  const templeName = (id: string) => temples.find((t) => t.id === id)?.name.en ?? id
  return toCsv(
    [
      'Order number',
      'Temple',
      'Devotee',
      'Phone',
      'Star',
      'Offering date',
      'Offerings',
      'Total (INR)',
      'Status',
      'Placed at (IST)',
    ],
    orders.map((o) => [
      o.orderNumber,
      templeName(o.templeId),
      o.devoteeName,
      o.phone,
      o.star,
      o.offeringDate,
      o.items.map((i) => `${i.offeringName.en} × ${i.quantity}`).join('; '),
      o.totalAmount,
      o.status,
      formatDateTimeIST(o.createdAt),
    ]),
  )
}
