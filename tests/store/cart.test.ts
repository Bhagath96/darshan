import { describe, expect, it } from 'vitest'
import { makeStore } from '@/store'
import {
  cartReplacedWith,
  itemAdded,
  itemRemoved,
  loadCartState,
  quantitySet,
  selectCartCount,
  selectCartTotal,
} from '@/store/vazhipadu/cartSlice'
import { offeringsLoaded } from '@/store/vazhipadu/offeringsSlice'
import { STORAGE_KEYS } from '@/store/persistence'
import type { Offering } from '@/types'

const offering = (id: string, price: number, templeId = 'tm-krishna'): Offering => ({
  id,
  templeId,
  name: { en: id, ml: id },
  description: { en: '', ml: '' },
  price,
  isActive: true,
  category: 'POOJA',
  image: 'lamp',
})

const pushpanjali = offering('tm-krishna--pushpanjali', 30)
const archana = offering('tm-krishna--archana', 50)

describe('cart slice', () => {
  it('totals 2 × ₹30 + 1 × ₹50 = ₹110', () => {
    const store = makeStore()
    store.dispatch(itemAdded(pushpanjali))
    store.dispatch(itemAdded(pushpanjali))
    store.dispatch(itemAdded(archana))
    expect(selectCartTotal(store.getState())).toBe(110)
    expect(selectCartCount(store.getState())).toBe(3)
  })

  it('keeps quantity between 1 and 10', () => {
    const store = makeStore()
    store.dispatch(itemAdded(pushpanjali))
    store.dispatch(quantitySet({ offeringId: pushpanjali.id, quantity: 25 }))
    expect(store.getState().cart.items[0]?.quantity).toBe(10)
    store.dispatch(quantitySet({ offeringId: pushpanjali.id, quantity: 0 }))
    expect(store.getState().cart.items[0]?.quantity).toBe(1)
  })

  it('ignores an offering from another temple unless the cart is replaced', () => {
    const store = makeStore()
    store.dispatch(itemAdded(pushpanjali))
    const other = offering('tm-sastha--archana', 50, 'tm-sastha')
    store.dispatch(itemAdded(other))
    expect(store.getState().cart.items.map((i) => i.offeringId)).toEqual([pushpanjali.id])
    store.dispatch(cartReplacedWith(other))
    expect(store.getState().cart).toMatchObject({
      templeId: 'tm-sastha',
      items: [{ offeringId: other.id }],
    })
  })

  it('forgets the temple when the last line is removed', () => {
    const store = makeStore()
    store.dispatch(itemAdded(pushpanjali))
    store.dispatch(itemRemoved(pushpanjali.id))
    expect(store.getState().cart).toEqual({ templeId: null, items: [] })
  })

  it('follows new prices and drops offerings that were switched off', () => {
    const store = makeStore()
    store.dispatch(itemAdded(pushpanjali))
    store.dispatch(itemAdded(archana))
    store.dispatch(
      offeringsLoaded({
        templeId: 'tm-krishna',
        requestId: 'any',
        offerings: [
          { ...pushpanjali, price: 40 },
          { ...archana, isActive: false },
        ],
      }),
    )
    expect(store.getState().cart.items).toMatchObject([
      { offeringId: pushpanjali.id, unitPrice: 40 },
    ])
  })

  it('is saved and loaded back, ignoring a damaged copy', async () => {
    const store = makeStore()
    store.dispatch(itemAdded(archana))
    await Promise.resolve()
    expect(loadCartState().items).toHaveLength(1)

    localStorage.setItem(
      STORAGE_KEYS.cart,
      JSON.stringify({ templeId: 'x', items: [{ offeringId: 'y', quantity: 99 }] }),
    )
    expect(loadCartState()).toEqual({ templeId: null, items: [] })
  })
})
