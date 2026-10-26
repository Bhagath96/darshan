import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { requireUser } from './session'
import { MAX_OFFERING_PRICE } from '@/lib/constants'
import type { Offering, OfferingUpdate, Temple } from '@/types'

/** Public: every temple, in a fixed order. */
export function getTemples(): Promise<Temple[]> {
  return simulate('content', () => getDb().temples)
}

/** Public: one temple with its full details. */
export function getTemple(templeId: string): Promise<Temple> {
  return simulate('content', () => {
    const temple = getDb().temples.find((t) => t.id === templeId)
    if (!temple) throw new ApiError('NOT_FOUND', 'Temple not found.')
    return temple
  })
}

/**
 * All offerings of a temple, including inactive ones (with `isActive: false`).
 * Devotee screens hide inactive offerings; staff screens can still show them.
 */
export function getOfferings(templeId: string): Promise<Offering[]> {
  return simulate('vazhipadu', () => {
    const db = getDb()
    if (!db.temples.some((t) => t.id === templeId)) {
      throw new ApiError('NOT_FOUND', 'Temple not found.')
    }
    return db.offerings.filter((o) => o.templeId === templeId)
  })
}

/** Admin: change an offering's price or switch it on/off. Existing orders keep their price. */
export function updateOffering({ offeringId, price, isActive }: OfferingUpdate): Promise<Offering> {
  return simulate('vazhipadu', () => {
    requireUser('catalog:manage')
    const offering = getDb().offerings.find((o) => o.id === offeringId)
    if (!offering) throw new ApiError('NOT_FOUND', 'Offering not found.')
    if (price !== undefined) {
      if (!Number.isInteger(price) || price < 1 || price > MAX_OFFERING_PRICE) {
        throw new ApiError(
          'VALIDATION',
          `Price must be whole rupees from ₹1 to ₹${MAX_OFFERING_PRICE.toLocaleString('en-IN')}.`,
        )
      }
      offering.price = price
    }
    if (isActive !== undefined) offering.isActive = isActive
    return offering
  })
}
