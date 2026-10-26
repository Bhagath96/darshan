import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { getDb } from '@/api/db'
import { seedNotices, seedOfferings, seedTemples, seedUsers } from '@/api/seed'
import { NAKSHATRA_IDS, NOTICE_CATEGORIES, OFFERING_CATEGORIES } from '@/lib/constants'
import { freezeTime, TODAY } from '../utils/api'

// The JSON files are cast to their types in seed.ts; these schemas check that the cast is true.
const localized = z.object({ en: z.string().min(1), ml: z.string().min(1) })

const userSchema = z.strictObject({
  id: z.string(),
  username: z.string(),
  password: z.string(),
  name: z.string(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  role: z.enum(['DEVOTEE', 'STAFF', 'ADMIN']),
  templeId: z.string().nullable(),
})

const templeSchema = z.strictObject({
  id: z.string(),
  name: localized,
  location: localized,
  deity: localized,
  image: z.string(),
  timings: z.string(),
  about: localized,
  address: localized,
  contactPhone: z.string().regex(/^0\d{10}$/),
  schedule: z
    .array(z.strictObject({ time: z.string().regex(/^\d{2}:\d{2}$/), name: localized }))
    .min(1),
})

const noticeSchema = z.strictObject({
  id: z.string(),
  templeId: z.string().nullable(),
  category: z.enum(NOTICE_CATEGORIES),
  important: z.boolean(),
  publishedDaysAgo: z.number().int().min(0),
  eventInDays: z.number().int().nullable(),
  title: localized,
  body: localized,
})

const offeringSchema = z.strictObject({
  id: z.string(),
  templeId: z.string(),
  name: localized,
  description: localized,
  price: z.number().int().positive(),
  isActive: z.boolean(),
  category: z.enum(OFFERING_CATEGORIES),
  image: z.string(),
})

describe('seed JSON files', () => {
  it('match their types', () => {
    expect(() => z.array(userSchema).parse(seedUsers)).not.toThrow()
    expect(() => z.array(templeSchema).parse(seedTemples)).not.toThrow()
    expect(() => z.array(offeringSchema).parse(seedOfferings)).not.toThrow()
    expect(() => z.array(noticeSchema).parse(seedNotices)).not.toThrow()
  })

  it('tie every notice to an existing temple (or to all temples)', () => {
    const templeIds = seedTemples.map((t) => t.id)
    for (const n of seedNotices) {
      if (n.templeId !== null) expect(templeIds).toContain(n.templeId)
    }
  })

  it('have the four demo users, with staff tied to an existing temple', () => {
    expect(seedUsers.map((u) => u.username)).toEqual(['devotee', 'lakshmi', 'staff', 'admin'])
    const staff = seedUsers.find((u) => u.role === 'STAFF')!
    expect(seedTemples.map((t) => t.id)).toContain(staff.templeId)
  })

  it('give each temple 8–10 offerings, Pushpanjali ₹30, Archana ₹50 and 1–2 inactive ones', () => {
    for (const temple of seedTemples) {
      const offerings = seedOfferings.filter((o) => o.templeId === temple.id)
      expect(offerings.length).toBeGreaterThanOrEqual(8)
      expect(offerings.length).toBeLessThanOrEqual(10)
      expect(offerings.find((o) => o.name.en === 'Pushpanjali')?.price).toBe(30)
      expect(offerings.find((o) => o.name.en === 'Archana')?.price).toBe(50)
      const inactive = offerings.filter((o) => !o.isActive).length
      expect(inactive).toBeGreaterThanOrEqual(1)
      expect(inactive).toBeLessThanOrEqual(2)
    }
  })

  it('use unique ids', () => {
    const ids = [...seedUsers, ...seedTemples, ...seedOfferings, ...seedNotices].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('generated seed data', () => {
  beforeEach(() => freezeTime())
  afterEach(() => vi.useRealTimers())

  it('has 7 days × 6 slots per temple, some full, some started', () => {
    const { slots } = getDb()
    expect(slots).toHaveLength(seedTemples.length * 7 * 6)
    expect(new Set(slots.map((s) => s.date)).size).toBe(7)
    expect(slots.some((s) => s.remainingTickets === 0)).toBe(true)
    expect(slots.some((s) => s.date === TODAY && new Date(s.startsAt) <= new Date())).toBe(true)
    expect(slots.every((s) => s.remainingTickets <= s.totalCapacity)).toBe(true)
  })

  it('has about 50 valid orders with server-side totals', () => {
    const { orders } = getDb()
    expect(orders).toHaveLength(50)
    for (const o of orders) {
      expect(o.items.length).toBeGreaterThan(0)
      expect(o.totalAmount).toBe(o.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))
      expect(NAKSHATRA_IDS).toContain(o.star)
    }
    expect(new Set(orders.map((o) => o.status))).toEqual(
      new Set(['CONFIRMED', 'CANCELLED', 'COMPLETED']),
    )
  })

  it('has about 20 bookings, including the demo devotee’s', () => {
    const { bookings } = getDb()
    expect(bookings.length).toBeGreaterThanOrEqual(20)
    expect(bookings.filter((b) => b.phone === '9847012345').length).toBeGreaterThanOrEqual(3)
  })

  it('is the same on every load', () => {
    const first = structuredClone(getDb().orders)
    freezeTime()
    expect(getDb().orders).toEqual(first)
  })
})
