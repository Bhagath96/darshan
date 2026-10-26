import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { loadJson, STORAGE_KEYS } from '../persistence'
import type { RootState } from '../rootReducer'
import { orderPlaced } from './checkoutSlice'
import { offeringsLoaded } from './offeringsSlice'
import { MAX_QUANTITY, MIN_QUANTITY } from '@/lib/constants'
import type { CartItem, Offering } from '@/types'

/** One temple per cart: an order goes to one temple's counter. */
export interface CartState {
  templeId: string | null
  items: CartItem[]
}

const initialState: CartState = { templeId: null, items: [] }

const clamp = (n: number) => Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(n)))

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false
  const i = value as Record<string, unknown>
  const name = i.name as Record<string, unknown> | null
  return (
    typeof i.offeringId === 'string' &&
    typeof i.templeId === 'string' &&
    typeof i.unitPrice === 'number' &&
    Number.isInteger(i.quantity) &&
    (i.quantity as number) >= MIN_QUANTITY &&
    (i.quantity as number) <= MAX_QUANTITY &&
    typeof name === 'object' &&
    name !== null &&
    typeof name.en === 'string' &&
    typeof name.ml === 'string'
  )
}

function isCart(value: unknown): value is CartState {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    (c.templeId === null || typeof c.templeId === 'string') &&
    Array.isArray(c.items) &&
    c.items.every(isCartItem) &&
    c.items.every((i) => (i as CartItem).templeId === c.templeId)
  )
}

/** The cart survives a reload; a damaged or hand-edited saved cart is ignored. */
export function loadCartState(): CartState {
  return loadJson(STORAGE_KEYS.cart, isCart) ?? initialState
}

const toItem = (o: Offering): CartItem => ({
  offeringId: o.id,
  templeId: o.templeId,
  name: o.name,
  unitPrice: o.price,
  quantity: 1,
})

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /** Adds one. Another temple's offering is ignored here: the UI asks first, then replaces. */
    itemAdded(state, action: PayloadAction<Offering>) {
      const offering = action.payload
      if (state.templeId && state.templeId !== offering.templeId) return
      state.templeId = offering.templeId
      const line = state.items.find((i) => i.offeringId === offering.id)
      if (line) line.quantity = clamp(line.quantity + 1)
      else state.items.push(toItem(offering))
    },
    /** Empties the cart and starts it with this offering (after the user agreed). */
    cartReplacedWith(state, action: PayloadAction<Offering>) {
      state.templeId = action.payload.templeId
      state.items = [toItem(action.payload)]
    },
    quantitySet(state, action: PayloadAction<{ offeringId: string; quantity: number }>) {
      const line = state.items.find((i) => i.offeringId === action.payload.offeringId)
      if (line && Number.isFinite(action.payload.quantity))
        line.quantity = clamp(action.payload.quantity)
    },
    itemRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.offeringId !== action.payload)
      if (state.items.length === 0) state.templeId = null
    },
    cartCleared() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      // Placed: the order now holds these lines.
      .addCase(orderPlaced, () => initialState)
      // Fresh catalogue data: follow price changes, drop offerings that were switched off.
      .addCase(offeringsLoaded, (state, action) => {
        if (state.templeId !== action.payload.templeId) return
        const byId = new Map(action.payload.offerings.map((o) => [o.id, o]))
        state.items = state.items.flatMap((item) => {
          const fresh = byId.get(item.offeringId)
          return fresh?.isActive ? [{ ...item, unitPrice: fresh.price, name: fresh.name }] : []
        })
        if (state.items.length === 0) state.templeId = null
      })
  },
})

export const { itemAdded, cartReplacedWith, quantitySet, itemRemoved, cartCleared } =
  cartSlice.actions
export default cartSlice.reducer

export const selectCart = (state: RootState) => state.cart
export const selectCartCount = (state: RootState) =>
  state.cart.items.reduce((n, i) => n + i.quantity, 0)
export const selectCartTotal = (state: RootState) =>
  state.cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
