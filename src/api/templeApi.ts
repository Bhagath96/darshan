import { ApiError } from './errors'
import { getDb } from './db'
import { simulate } from './mockClient'
import { requireUser } from './session'
import { standardSlots } from './seed'
import {
  assertTempleScope,
  cleanLocalized,
  requireTemple,
  slugify,
  uniqueId,
  validTime,
} from './validate'
import {
  MAX_OFFERING_PRICE,
  MAX_SCHEDULE_ITEMS,
  OFFERING_CATEGORIES,
  OFFERING_DESCRIPTION_MAX,
  OFFERING_NAME_MAX,
  TEMPLE_ABOUT_MAX,
  TEMPLE_TEXT_MAX,
} from '@/lib/constants'
import type { Offering, OfferingInput, OfferingUpdate, Temple, TempleInput } from '@/types'

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

// ---- Temples (admin) ----------------------------------------------------------

const CONTACT_PHONE = /^\+?[\d -]{6,20}$/

function cleanTemple(input: TempleInput): Omit<Temple, 'id'> {
  const contactPhone = input.contactPhone.trim()
  if (!CONTACT_PHONE.test(contactPhone))
    throw new ApiError('VALIDATION', 'Please enter the temple phone number (digits only).')
  const timings = input.timings.trim()
  if (!timings || timings.length > TEMPLE_TEXT_MAX)
    throw new ApiError(
      'VALIDATION',
      `Please enter the opening hours (up to ${TEMPLE_TEXT_MAX} characters).`,
    )
  if (!input.image.trim()) throw new ApiError('VALIDATION', 'Please choose a photo.')
  if (input.schedule.length > MAX_SCHEDULE_ITEMS)
    throw new ApiError('VALIDATION', `A schedule can have at most ${MAX_SCHEDULE_ITEMS} poojas.`)
  const schedule = input.schedule
    .map((item) => ({
      time: validTime(item.time),
      name: cleanLocalized(item.name, TEMPLE_TEXT_MAX, 'pooja name'),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return {
    name: cleanLocalized(input.name, TEMPLE_TEXT_MAX, 'temple name'),
    location: cleanLocalized(input.location, TEMPLE_TEXT_MAX, 'location'),
    deity: cleanLocalized(input.deity, TEMPLE_TEXT_MAX, 'deity'),
    about: cleanLocalized(input.about, TEMPLE_ABOUT_MAX, 'description'),
    address: cleanLocalized(input.address, TEMPLE_ABOUT_MAX, 'address'),
    image: input.image.trim(),
    timings,
    contactPhone,
    schedule,
  }
}

/**
 * Admin: adds a temple. With `addStandardSlots`, it also gets the usual six darshan
 * slots a day for the coming week, so devotees can book straight away.
 */
export function createTemple(input: TempleInput, addStandardSlots = true): Promise<Temple> {
  return simulate('content', () => {
    requireUser('temple:manage')
    const db = getDb()
    const clean = cleanTemple(input)
    const id = uniqueId(`tm-${slugify(clean.name.en)}`, (x) => db.temples.some((t) => t.id === x))
    const temple: Temple = { id, ...clean }
    db.temples.push(temple)
    if (addStandardSlots) db.slots.push(...standardSlots(id, new Date()))
    return temple
  })
}

/** Admin: replaces a temple's details. Its id (used in links) stays the same. */
export function updateTemple(templeId: string, input: TempleInput): Promise<Temple> {
  return simulate('content', () => {
    requireUser('temple:manage')
    const temple = getDb().temples.find((t) => t.id === templeId)
    if (!temple) throw new ApiError('NOT_FOUND', 'Temple not found.')
    Object.assign(temple, cleanTemple(input))
    return temple
  })
}

/**
 * Admin: deletes a temple with its offerings, slots, bookings, orders and notices.
 * Refused while staff accounts belong to it: move or delete them first.
 */
export function deleteTemple(templeId: string): Promise<void> {
  return simulate('content', () => {
    requireUser('temple:manage')
    const db = getDb()
    if (!db.temples.some((t) => t.id === templeId)) return
    const staff = db.users.filter((u) => u.templeId === templeId).length
    if (staff > 0) {
      throw new ApiError(
        'CONFLICT',
        `${staff} staff account${staff === 1 ? ' belongs' : 's belong'} to this temple. Move them to another temple or delete them first.`,
      )
    }
    const other = <T extends { templeId: string | null }>(x: T) => x.templeId !== templeId
    db.temples = db.temples.filter((t) => t.id !== templeId)
    db.offerings = db.offerings.filter(other)
    db.slots = db.slots.filter(other)
    db.bookings = db.bookings.filter(other)
    db.orders = db.orders.filter(other)
    db.notices = db.notices.filter(other)
  })
}

// ---- Offerings ------------------------------------------------------------------

/**
 * All offerings of a temple, including inactive ones (with `isActive: false`).
 * Devotee screens hide inactive offerings; staff screens can still show them.
 */
export function getOfferings(templeId: string): Promise<Offering[]> {
  return simulate('vazhipadu', () => {
    requireTemple(templeId)
    return getDb().offerings.filter((o) => o.templeId === templeId)
  })
}

function validPrice(price: number): number {
  if (!Number.isInteger(price) || price < 1 || price > MAX_OFFERING_PRICE) {
    throw new ApiError(
      'VALIDATION',
      `Price must be whole rupees from ₹1 to ₹${MAX_OFFERING_PRICE.toLocaleString('en-IN')}.`,
    )
  }
  return price
}

function findOffering(offeringId: string): Offering {
  const offering = getDb().offerings.find((o) => o.id === offeringId)
  if (!offering) throw new ApiError('NOT_FOUND', 'Offering not found.')
  return offering
}

function cleanOffering(input: OfferingInput): Omit<Offering, 'id' | 'templeId'> {
  if (!(OFFERING_CATEGORIES as readonly string[]).includes(input.category))
    throw new ApiError('VALIDATION', 'Please choose a category.')
  if (!input.image.trim()) throw new ApiError('VALIDATION', 'Please choose a photo.')
  return {
    name: cleanLocalized(input.name, OFFERING_NAME_MAX, 'offering name'),
    description: cleanLocalized(input.description, OFFERING_DESCRIPTION_MAX, 'description'),
    price: validPrice(input.price),
    category: input.category,
    isActive: input.isActive,
    image: input.image.trim(),
  }
}

/** Staff/admin: change an offering's price or switch it on/off. Existing orders keep their price. */
export function updateOffering({ offeringId, price, isActive }: OfferingUpdate): Promise<Offering> {
  return simulate('vazhipadu', () => {
    const user = requireUser('catalog:manage')
    const offering = findOffering(offeringId)
    assertTempleScope(user, offering.templeId)
    if (price !== undefined) offering.price = validPrice(price)
    if (isActive !== undefined) offering.isActive = isActive
    return offering
  })
}

/** Staff/admin: adds an offering to a temple's catalogue. */
export function createOffering(input: OfferingInput): Promise<Offering> {
  return simulate('vazhipadu', () => {
    const user = requireUser('catalog:manage')
    requireTemple(input.templeId)
    assertTempleScope(user, input.templeId)
    const db = getDb()
    const clean = cleanOffering(input)
    const id = uniqueId(`${input.templeId}--${slugify(clean.name.en)}`, (x) =>
      db.offerings.some((o) => o.id === x),
    )
    const offering: Offering = { id, templeId: input.templeId, ...clean }
    db.offerings.push(offering)
    return offering
  })
}

/** Staff/admin: replaces an offering's details. It stays with the same temple. */
export function saveOffering(offeringId: string, input: OfferingInput): Promise<Offering> {
  return simulate('vazhipadu', () => {
    const user = requireUser('catalog:manage')
    const offering = findOffering(offeringId)
    assertTempleScope(user, offering.templeId)
    if (input.templeId !== offering.templeId)
      throw new ApiError('VALIDATION', 'An offering cannot be moved to another temple.')
    Object.assign(offering, cleanOffering(input))
    return offering
  })
}

/** Staff/admin: removes an offering. Past orders keep its name and price. */
export function deleteOffering(offeringId: string): Promise<void> {
  return simulate('vazhipadu', () => {
    const user = requireUser('catalog:manage')
    const db = getDb()
    const offering = db.offerings.find((o) => o.id === offeringId)
    if (!offering) return
    assertTempleScope(user, offering.templeId)
    db.offerings = db.offerings.filter((o) => o.id !== offeringId)
  })
}
